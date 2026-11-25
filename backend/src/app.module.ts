import { ContentModule } from "./content/content.module.js";
import { AdministrationModule } from "./security/administration.module.js";
import { Module } from "@nestjs/common";
import { ConfigurationModule } from "./config/configuration.module.js";
import { HealthModule } from "./health/health.module.js";
import { CatalogModule } from "./catalog/catalog.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { InquiryModule } from "./inquiries/inquiry.module.js";
import { InquiryWorkflowModule } from "./inquiries/workflow.module.js";

@Module({
  imports: [
    ConfigurationModule,
    HealthModule,
    CatalogModule,
    AuthModule,
    InquiryModule,
    InquiryWorkflowModule,
    ContentModule,
    AdministrationModule,
  ],
})
export class AppModule {}
