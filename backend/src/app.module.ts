import { Module } from "@nestjs/common";
import { ConfigurationModule } from "./config/configuration.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({ imports: [ConfigurationModule, HealthModule] })
export class AppModule {}
