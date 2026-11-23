import { Module } from "@nestjs/common";
import { ConfigurationModule } from "./config/configuration.module.js";
import { HealthModule } from "./health/health.module.js";
import { CatalogModule } from "./catalog/catalog.module.js";

@Module({ imports: [ConfigurationModule, HealthModule, CatalogModule] })
export class AppModule {}
