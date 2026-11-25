import type { MigrationInterface, QueryRunner } from "typeorm";
export class StaffSecurity1795608000000 implements MigrationInterface {
  transaction = false;
  async up(q: QueryRunner) {
    await q.query(
      "ALTER TABLE auth_users ADD suspendedAt datetime NULL, ADD staffRevision int NOT NULL DEFAULT 0",
    );
    await q.query(
      "ALTER TABLE auth_sessions ADD assurance varchar(16) NOT NULL DEFAULT 'password', ADD authenticatedAt datetime NULL, ADD mfaAt datetime NULL, ADD attempts int NOT NULL DEFAULT 0",
    );
    await q.query("ALTER TABLE inquiry_audit_events ADD requestId varchar(36) NULL");
    await q.query("ALTER TABLE staff_editorial_events ADD requestId varchar(36) NULL");
    await q.query(
      `CREATE TABLE staff_administration_lock (id int PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await q.query("INSERT INTO staff_administration_lock VALUES (1)");
    await q.query(
      `CREATE TABLE staff_mfa_factors (userId varchar(36) PRIMARY KEY,secret text NULL,confirmedAt datetime NULL,lastStep bigint NULL,pending text NULL,pendingSession varchar(64) NULL,pendingUntil datetime NULL,failures int NOT NULL DEFAULT 0,windowStarted datetime NULL,FOREIGN KEY(userId) REFERENCES auth_users(id) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await q.query(
      `CREATE TABLE staff_recovery_codes (userId varchar(36) NOT NULL,hash varchar(64) NOT NULL,consumedAt datetime NULL,PRIMARY KEY(userId,hash),FOREIGN KEY(userId) REFERENCES auth_users(id) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await q.query(
      `CREATE TABLE staff_invitations (id varchar(36) PRIMARY KEY,tokenHash varchar(64) NOT NULL,email varchar(254) NOT NULL,role varchar(24) NOT NULL,createdBy varchar(36) NOT NULL,createdAt datetime NOT NULL,expiresAt datetime NOT NULL,consumedAt datetime NULL,revokedAt datetime NULL,UNIQUE KEY invitation_hash(tokenHash),KEY invitation_email(email),FOREIGN KEY(createdBy) REFERENCES auth_users(id) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
    await q.query(
      `CREATE TABLE staff_audit_events (id varchar(36) PRIMARY KEY,actorId varchar(36) NULL,actorRole varchar(24) NOT NULL,action varchar(80) NOT NULL,target varchar(120) NOT NULL,requestId varchar(36) NOT NULL,requestKey varchar(36) NULL,fingerprint varchar(64) NULL,changes json NOT NULL,createdAt datetime(3) NOT NULL,UNIQUE KEY staff_audit_receipt(actorId,requestKey),KEY staff_audit_date(createdAt,id),KEY staff_audit_actor(actorId,createdAt),KEY staff_audit_target(target,createdAt),FOREIGN KEY(actorId) REFERENCES auth_users(id) ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );
  }
  async down(q: QueryRunner) {
    for (const sql of [
      "SELECT COUNT(*) n FROM auth_sessions WHERE assurance='mfa' OR mfaAt IS NOT NULL",
      "SELECT COUNT(*) n FROM inquiry_audit_events WHERE requestId IS NOT NULL",
      "SELECT COUNT(*) n FROM staff_editorial_events WHERE requestId IS NOT NULL",
    ])
      if (Number((await q.query(sql))[0].n))
        throw new Error(
          "Security assurance or correlated audit data exists; use reviewed forward recovery",
        );
    for (const t of [
      "staff_mfa_factors",
      "staff_recovery_codes",
      "staff_invitations",
      "staff_audit_events",
    ])
      if (Number((await q.query(`SELECT COUNT(*) n FROM ${t}`))[0].n))
        throw new Error("Staff security data exists; use reviewed forward recovery");
    if (
      Number(
        (
          await q.query(
            "SELECT COUNT(*) n FROM auth_users WHERE suspendedAt IS NOT NULL OR staffRevision<>0",
          )
        )[0].n,
      )
    )
      throw new Error("Staff administration data exists; use reviewed forward recovery");
    for (const t of [
      "staff_recovery_codes",
      "staff_mfa_factors",
      "staff_invitations",
      "staff_audit_events",
      "staff_administration_lock",
    ])
      await q.query(`DROP TABLE ${t}`);
    await q.query("ALTER TABLE staff_editorial_events DROP COLUMN requestId");
    await q.query("ALTER TABLE inquiry_audit_events DROP COLUMN requestId");
    await q.query(
      "ALTER TABLE auth_sessions DROP COLUMN assurance,DROP COLUMN authenticatedAt,DROP COLUMN mfaAt,DROP COLUMN attempts",
    );
    await q.query("ALTER TABLE auth_users DROP COLUMN suspendedAt,DROP COLUMN staffRevision");
  }
}
