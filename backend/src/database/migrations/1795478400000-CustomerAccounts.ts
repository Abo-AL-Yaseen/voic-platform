import type { MigrationInterface, QueryRunner } from "typeorm";

export class CustomerAccounts1795478400000 implements MigrationInterface {
  name = "CustomerAccounts1795478400000";
  transaction = false;
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE auth_users (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL UNIQUE,
      passwordHash VARCHAR(255) NOT NULL, role VARCHAR(24) NOT NULL DEFAULT 'customer',
      kind VARCHAR(16) NOT NULL, name VARCHAR(100) NOT NULL, company VARCHAR(150) NULL,
      country VARCHAR(100) NOT NULL, phone VARCHAR(40) NULL, emailVerifiedAt DATETIME NULL,
      securityVersion INT NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE auth_sessions (
      tokenHash VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
      userId VARCHAR(36) NULL, securityVersion INT NOT NULL, expiresAt DATETIME NOT NULL,
      INDEX auth_session_expiry (expiresAt), INDEX auth_session_user (userId),
      CONSTRAINT auth_session_user_fk FOREIGN KEY (userId) REFERENCES auth_users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE auth_action_tokens (
      tokenHash VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
      userId VARCHAR(36) NOT NULL, purpose VARCHAR(16) NOT NULL,
      expiresAt DATETIME NOT NULL, consumedAt DATETIME NULL,
      INDEX auth_action_user (userId, purpose), INDEX auth_action_expiry (expiresAt),
      CONSTRAINT auth_action_user_fk FOREIGN KEY (userId) REFERENCES auth_users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(runner: QueryRunner) {
    for (const table of ["auth_action_tokens", "auth_sessions", "auth_users"])
      await runner.query(`DROP TABLE ${table}`);
  }
}
