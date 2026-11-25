import type { DataSource } from "typeorm";

// Table identifiers are fixed; callers cannot supply a business-table deletion target.
export async function cleanupExpiredSecurity(source: DataSource, apply = false) {
  const counts: Record<string, { expired: number; removed: number }> = {};
  for (const table of ["auth_sessions", "auth_action_tokens", "operational_rate_limits"]) {
    const [{ n }] = await source.query(
      `SELECT COUNT(*) n FROM ${table} WHERE expiresAt<=UTC_TIMESTAMP(3)`,
    );
    counts[table] = { expired: Number(n), removed: 0 };
    if (apply)
      counts[table].removed = (
        await source.query(`DELETE FROM ${table} WHERE expiresAt<=UTC_TIMESTAMP(3) LIMIT 1000`)
      ).affectedRows;
  }
  return { event: "expired_security_cleanup", dryRun: !apply, maxRowsPerTable: 1000, counts };
}
