import { HttpException, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";

@Injectable()
export class AuthRateLimit {
  private readonly entries = new Map<string, { n: number; until: number }>();
  take(scope: string, identity: string, limit: number, windowMs = 15 * 60_000) {
    const now = Date.now();
    for (const [key, value] of this.entries) if (value.until <= now) this.entries.delete(key);
    const key = createHash("sha256").update(`${scope}:${identity}`).digest("hex");
    const value = this.entries.get(key) ?? { n: 0, until: now + windowMs };
    if (value.n >= limit || (!this.entries.has(key) && this.entries.size >= 10000))
      throw new HttpException("Too many requests", 429);
    value.n++;
    this.entries.set(key, value);
  }
}
