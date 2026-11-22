import { join } from "node:path";
import type { DataSourceOptions } from "typeorm";
import type { Environment } from "../config/environment.js";

export function databaseOptions(env: Environment): DataSourceOptions {
  return {
    type: "mysql",
    host: env.dbHost,
    port: env.dbPort,
    database: env.dbDatabase,
    username: env.dbUsername,
    password: env.dbPassword,
    charset: "utf8mb4",
    timezone: "Z",
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    entities: [],
    migrations: [join(import.meta.dirname, "migrations", "*.js")],
    migrationsTableName: "voic_migrations",
    migrationsTransactionMode: "each",
    connectTimeout: env.dbTimeoutMs,
    maxQueryExecutionTime: env.dbTimeoutMs,
    enableQueryTimeout: true,
    multipleStatements: false,
    poolSize: 5,
    extra: { waitForConnections: true, queueLimit: 10, enableKeepAlive: true },
    logging: false,
    // Slow-query and migration logging must not print SQL, parameters or credentials.
    logger: {
      logQuery() {},
      logQueryError() {},
      logQuerySlow() {},
      logSchemaBuild() {},
      logMigration() {},
      log() {},
    },
  };
}
