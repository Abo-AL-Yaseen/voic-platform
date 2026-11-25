import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { isIP } from "node:net";
import { isAbsolute } from "node:path";

export type Environment = Readonly<{
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  corsOrigins: readonly string[];
  dbHost: string;
  dbPort: number;
  dbDatabase: string;
  dbUsername: string;
  dbPassword: string;
  dbTimeoutMs: number;
  trustProxy: readonly string[];
  dbTls: boolean;
  dbTlsCa?: string;
}>;

export class ConfigurationError extends Error {}

// Error messages contain field names and fixed guidance only, never supplied values.
export function validateEnvironment(input: NodeJS.ProcessEnv): Environment {
  const errors: string[] = [];
  const required = (key: string): string => {
    const value = input[key];
    if (!value?.trim()) errors.push(`${key} is required`);
    return value ?? "";
  };
  const number = (key: string, min: number, max: number): number => {
    const value = required(key);
    if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max)
      errors.push(`${key} must be an integer between ${min} and ${max}`);
    return Number(value);
  };
  const nodeEnv = required("NODE_ENV");
  if (!["development", "test", "production"].includes(nodeEnv))
    errors.push("NODE_ENV must be development, test or production");
  const host = required("HOST");
  if (!/^[a-zA-Z0-9.:-]+$/.test(host)) errors.push("HOST must be a hostname or IP address");
  const port = number("PORT", 1, 65535);
  const dbHost = required("DB_HOST");
  if (!/^[a-zA-Z0-9.:-]+$/.test(dbHost)) errors.push("DB_HOST must be a hostname or IP address");
  const dbPort = number("DB_PORT", 1, 65535);
  const dbDatabase = required("DB_DATABASE");
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(dbDatabase))
    errors.push("DB_DATABASE must be a simple database identifier");
  const dbUsername = required("DB_USERNAME");
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(dbUsername) || dbUsername.toLowerCase() === "root")
    errors.push("DB_USERNAME must be a dedicated non-root application user");
  const dbPassword = required("DB_PASSWORD");
  if (dbPassword.length < 16 || /^(replace-|change|<)/i.test(dbPassword))
    errors.push("DB_PASSWORD must replace the placeholder and contain at least 16 characters");
  const dbTimeoutMs = number("DB_TIMEOUT_MS", 500, 10000);
  if (
    (nodeEnv === "production" && !input.MEDIA_ROOT) ||
    (input.MEDIA_ROOT && !isAbsolute(input.MEDIA_ROOT))
  )
    errors.push("MEDIA_ROOT must be an explicit absolute persistent directory in production");
  if (input.DB_TLS && !["true", "false"].includes(input.DB_TLS))
    errors.push("DB_TLS must be true or false");
  const dbTls = input.DB_TLS === "true";
  if (nodeEnv === "production" && dbTls && isIP(dbHost) && !["127.0.0.1", "::1"].includes(dbHost))
    errors.push("Remote MySQL TLS requires a certificate-matching DNS hostname");
  if (nodeEnv === "production" && !["127.0.0.1", "::1", "localhost"].includes(dbHost) && !dbTls)
    errors.push("Production remote MySQL requires DB_TLS=true with certificate verification");
  let dbTlsCa: string | undefined;
  if (input.DB_TLS_CA_FILE) {
    try {
      if (!dbTls) throw new Error();
      const ca = readFileSync(input.DB_TLS_CA_FILE);
      if (ca.length > 1024 * 1024 || !ca.includes("-----BEGIN CERTIFICATE-----")) throw new Error();
      dbTlsCa = ca.toString("utf8");
    } catch {
      errors.push("DB_TLS_CA_FILE must be a readable CA certificate used with DB_TLS=true");
    }
  }
  const trustProxy = (input.TRUST_PROXY_CIDRS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (
    trustProxy.some((v) => {
      const [ip, prefix, ...rest] = v.split("/");
      const family = isIP(ip!);
      return (
        !family ||
        rest.length ||
        (prefix !== undefined &&
          (!/^\d+$/.test(prefix) ||
            Number(prefix) < 1 ||
            Number(prefix) > (family === 4 ? 32 : 128)))
      );
    })
  )
    errors.push("TRUST_PROXY_CIDRS must contain explicit proxy IP addresses or bounded CIDRs");
  const corsOrigins = required("CORS_ORIGINS")
    .split(",")
    .map((value) => value.trim());
  if (
    corsOrigins.some((origin) => {
      try {
        const url = new URL(origin);
        return (
          !["http:", "https:"].includes(url.protocol) ||
          url.origin !== origin ||
          url.username !== "" ||
          url.password !== "" ||
          origin.includes("*")
        );
      } catch {
        return true;
      }
    })
  )
    errors.push(
      "CORS_ORIGINS must be comma-separated explicit HTTP(S) origins without paths or wildcards",
    );
  if (errors.length)
    throw new ConfigurationError(`Invalid environment settings: ${errors.join("; ")}`);
  return Object.freeze({
    nodeEnv: nodeEnv as Environment["nodeEnv"],
    host,
    port,
    corsOrigins: Object.freeze([...new Set(corsOrigins)]),
    dbHost,
    dbPort,
    dbDatabase,
    dbUsername,
    dbPassword,
    dbTimeoutMs,
    trustProxy: Object.freeze(trustProxy),
    dbTls,
    dbTlsCa,
  });
}

export function loadEnvironment(): Environment {
  // Node's loader preserves already exported variables. Resolve .env from backend/ cwd.
  if (existsSync(".env")) loadEnvFile(".env");
  return validateEnvironment(process.env);
}
