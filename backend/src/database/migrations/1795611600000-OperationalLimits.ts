import type { MigrationInterface, QueryRunner } from "typeorm";

export class OperationalLimits1795611600000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE operational_rate_limits (
      bucket char(64) PRIMARY KEY, hits int unsigned NOT NULL,
      expiresAt datetime(3) NOT NULL, KEY limiter_expiry(expiresAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(q: QueryRunner) {
    if (
      Number(
        (
          await q.query(
            "SELECT COUNT(*) n FROM operational_rate_limits WHERE expiresAt>UTC_TIMESTAMP(3)",
          )
        )[0].n,
      )
    )
      throw new Error("Active operational limits exist; use reviewed forward recovery");
    await q.query("DROP TABLE operational_rate_limits");
  }
}
