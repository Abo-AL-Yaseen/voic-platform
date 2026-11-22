import { Controller, Get, ServiceUnavailableException, Header } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get("live")
  @Header("Cache-Control", "no-store")
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @Header("Cache-Control", "no-store")
  async ready() {
    if (!(await this.database.isReady())) throw new ServiceUnavailableException();
    return { status: "ok" };
  }
}
