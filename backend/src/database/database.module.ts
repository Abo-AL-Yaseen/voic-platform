import { Module } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ENVIRONMENT } from "../config/configuration.module.js";
import type { Environment } from "../config/environment.js";
import { DATABASE_SOURCE, DatabaseService } from "./database.service.js";
import { databaseOptions } from "./options.js";

@Module({
  providers: [
    {
      provide: DATABASE_SOURCE,
      inject: [ENVIRONMENT],
      useFactory: (env: Environment) => new DataSource(databaseOptions(env)),
    },
    DatabaseService,
  ],
  exports: [DatabaseService, DATABASE_SOURCE],
})
export class DatabaseModule {}
