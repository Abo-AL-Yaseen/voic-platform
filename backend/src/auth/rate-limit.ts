import {
  HttpException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { type DataSource, type EntityManager } from "typeorm";
import { DATABASE_SOURCE } from "../database/database.service.js";
import { ENVIRONMENT } from "../config/configuration.module.js";
import type { Environment } from "../config/environment.js";

@Injectable()
export class AuthRateLimit {
  constructor(
    @Optional() @Inject(DATABASE_SOURCE) private readonly source?: DataSource,
    @Optional() @Inject(ENVIRONMENT) private readonly environment?: Environment,
  ) {}
  private readonly entries = new Map<string, { n: number; until: number }>();
  async take(
    scope: string,
    identity: string,
    limit: number,
    windowMs = 15 * 60_000,
    manager?: EntityManager,
  ) {
    const key = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
    if (this.environment?.nodeEnv === "production") {
      // A row lock serializes increments across API replicas. Only hashes are retained.
      // Database failure never falls back to per-process counters in production.
      if (!this.source?.isInitialized) throw new ServiceUnavailableException();
      let hits: number;
      try {
        const increment = async (m: EntityManager) => {
          await m.query(
            `INSERT INTO operational_rate_limits (bucket,hits,expiresAt)
            VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? MICROSECOND))
            ON DUPLICATE KEY UPDATE
            hits=IF(expiresAt<=UTC_TIMESTAMP(3),1,LEAST(hits+1,?)),
            expiresAt=IF(expiresAt<=UTC_TIMESTAMP(3),DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? MICROSECOND),expiresAt)`,
            [key, windowMs * 1000, limit + 1, windowMs * 1000],
          );
          return Number(
            (await m.query("SELECT hits FROM operational_rate_limits WHERE bucket=?", [key]))[0]
              .hits,
          );
        };
        hits = manager
          ? await increment(manager)
          : await this.source.transaction("READ COMMITTED", increment);
      } catch {
        throw new ServiceUnavailableException();
      }
      if (hits > limit) throw new HttpException("Too many requests", 429);
      return;
    }
    const now = Date.now();
    for (const [key, value] of this.entries) if (value.until <= now) this.entries.delete(key);
    const value = this.entries.get(key) ?? { n: 0, until: now + windowMs };
    if (value.n >= limit || (!this.entries.has(key) && this.entries.size >= 10000))
      throw new HttpException("Too many requests", 429);
    value.n++;
    this.entries.set(key, value);
  }
}
