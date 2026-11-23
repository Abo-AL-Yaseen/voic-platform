import { ConfigurationError, type Environment } from "../config/environment.js";

export const AUTH_CONFIG = Symbol("AUTH_CONFIG");
export type AuthConfig = ReturnType<typeof authConfiguration>;
export function authConfiguration(env: Environment, input = process.env) {
  const fail = () => {
    throw new ConfigurationError(
      "Invalid auth/mail configuration; check APP_URL and MAIL_*/SMTP_* settings.",
    );
  };
  let app: URL;
  try {
    app = new URL(input.APP_URL || (env.nodeEnv === "production" ? "" : "http://127.0.0.1:8443"));
  } catch {
    return fail();
  }
  if (
    app.username ||
    app.password ||
    app.search ||
    app.hash ||
    app.pathname !== "/" ||
    !["http:", "https:"].includes(app.protocol) ||
    (env.nodeEnv === "production" && app.protocol !== "https:")
  )
    return fail();
  const mode = input.MAIL_MODE || (env.nodeEnv === "production" ? "smtp" : "capture");
  if (
    env.nodeEnv === "production" &&
    env.corsOrigins.some((origin) => !origin.startsWith("https://"))
  )
    return fail();
  if (!["capture", "smtp"].includes(mode) || (mode === "capture" && env.nodeEnv === "production"))
    return fail();
  const from = input.MAIL_FROM || "VOIC <no-reply@voic.test>";
  if (/[\r\n]/.test(from) || from.length > 254) return fail();
  const smtpPort = Number(input.SMTP_PORT || 587);
  if (
    mode === "smtp" &&
    (!input.SMTP_HOST ||
      !Number.isInteger(smtpPort) ||
      smtpPort < 1 ||
      smtpPort > 65535 ||
      !input.MAIL_FROM)
  )
    return fail();
  if (input.SMTP_SECURE && !["true", "false"].includes(input.SMTP_SECURE)) return fail();
  if (!!input.SMTP_USER !== !!input.SMTP_PASSWORD) return fail();
  // Capture files can only live beneath the ignored backend .tmp directory.
  const captureName = input.MAIL_CAPTURE_NAME || "mail";
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(captureName)) return fail();
  return {
    appUrl: app.origin,
    mode,
    from,
    captureDir: `.tmp/${captureName}`,
    smtpHost: input.SMTP_HOST,
    smtpPort,
    smtpSecure: input.SMTP_SECURE === "true",
    smtpUser: input.SMTP_USER,
    smtpPassword: input.SMTP_PASSWORD,
    production: env.nodeEnv === "production",
    origins: [...new Set([app.origin, ...env.corsOrigins])],
  };
}

export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 2000 ||
    !value.startsWith("/") ||
    /[\\\x00-\x20]/.test(value) ||
    value.startsWith("//")
  )
    return "/account";
  try {
    const url = new URL(value, "https://local.invalid");
    if (
      url.origin !== "https://local.invalid" ||
      !/^\/(?:account(?:\/(?:profile|security|inquiries))?|inquiries\/new|products(?:\/[a-z0-9-]+)?|find-your-product|staff(?:\/[a-z0-9/-]+)?)$/.test(
        url.pathname,
      )
    )
      return "/account";
    const p = new URLSearchParams();
    for (const key of ["products", "compare", "product", "lang"]) {
      const v = url.searchParams.get(key);
      if (v && (key === "lang" ? /^(ar|en)$/.test(v) : /^[a-z0-9,-]{1,1500}$/.test(v)))
        p.set(key, v);
    }
    return url.pathname + (p.size ? `?${p}` : "");
  } catch {
    return "/account";
  }
}
