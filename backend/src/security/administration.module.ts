import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuthService, type AuthRequest } from "../auth/auth.service.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdministrationService } from "./administration.service.js";
import { AuditService } from "./audit.service.js";
@Injectable()
class AdministrationBoundary implements CanActivate {
  constructor(readonly auth: AuthService) {}
  async canActivate(c: ExecutionContext) {
    const req = c.switchToHttp().getRequest<AuthRequest>();
    await this.auth.boundary(req, req.method === "GET");
    if (req.path !== "/api/v1/staff-invitation/accept")
      this.auth.permission(
        req,
        req.path === "/api/v1/staff/audit" ? "audit:read" : "employees:manage",
      );
    return true;
  }
}
@Controller()
@UseGuards(AdministrationBoundary)
class AdministrationController {
  constructor(
    readonly employees: AdministrationService,
    readonly audits: AuditService,
  ) {}
  @Get("staff/employees") list(@Req() r: AuthRequest) {
    return this.employees.list(r);
  }
  @Get("staff/employees/lookup") lookup(@Req() r: AuthRequest) {
    return this.employees.lookup(r);
  }
  @Get("staff/employees/:id") detail(@Req() r: AuthRequest, @Param("id") id: string) {
    return this.employees.detail(r, id);
  }
  @Post("staff/employees/:id/actions") action(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() d: unknown,
  ) {
    return this.employees.mutate(r, id, d);
  }
  @Get("staff/invitations") invitations(@Req() r: AuthRequest) {
    return this.employees.invitations(r);
  }
  @Post("staff/invitations") invite(@Req() r: AuthRequest, @Body() d: unknown) {
    return this.employees.invite(r, d);
  }
  @Post("staff/invitations/:id/actions") invitationAction(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() d: unknown,
  ) {
    return this.employees.invitationAction(r, id, d);
  }
  @Post("staff-invitation/accept") accept(@Req() r: AuthRequest, @Body() d: unknown) {
    return this.employees.accept(r, d);
  }
  @Get("staff/audit") audit(@Req() r: AuthRequest) {
    return this.audits.list(r);
  }
}
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AdministrationController],
  providers: [AdministrationService, AuditService, AdministrationBoundary],
})
export class AdministrationModule {}
