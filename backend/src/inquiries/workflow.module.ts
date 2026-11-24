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
import { AUTH_CONFIG, type AuthConfig } from "../auth/auth.config.js";
import { ENVIRONMENT } from "../config/configuration.module.js";
import type { Environment } from "../config/environment.js";
import { DatabaseModule } from "../database/database.module.js";
import { InquiryModule } from "./inquiry.module.js";
import { InquiryWorkflowService } from "./workflow.service.js";
import { CustomerReplyDto, WorkflowActionDto } from "./workflow.dto.js";
import { WORKFLOW_CONFIG, workflowConfiguration } from "./workflow.config.js";
@Injectable()
class StaffInquiryBoundary implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly workflow: InquiryWorkflowService,
  ) {}
  async canActivate(c: ExecutionContext) {
    const r = c.switchToHttp().getRequest<AuthRequest>();
    await this.auth.boundary(r, r.method === "GET");
    this.workflow.staff(r);
    return true;
  }
}
@Injectable()
class CustomerConversationBoundary implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(c: ExecutionContext) {
    const r = c.switchToHttp().getRequest<AuthRequest>();
    await this.auth.boundary(r, r.method === "GET");
    this.auth.require(r, ["customer"]);
    return true;
  }
}
@Controller("staff/inquiries")
@UseGuards(StaffInquiryBoundary)
class StaffInquiryController {
  constructor(private readonly service: InquiryWorkflowService) {}
  @Get() list(@Req() r: AuthRequest) {
    return this.service.list(r);
  }
  @Get("stats") stats(@Req() r: AuthRequest) {
    return this.service.stats(r);
  }
  @Get(":id") detail(@Req() r: AuthRequest, @Param("id") id: string) {
    return this.service.detail(r, id);
  }
  @Post(":id/actions") act(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() d: WorkflowActionDto,
  ) {
    return this.service.act(r, id, d);
  }
  @Get(":id/actions/:key") resolve(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Param("key") key: string,
  ) {
    return this.service.resolve(r, id, key);
  }
}
@Controller("account/inquiries")
@UseGuards(CustomerConversationBoundary)
class CustomerConversationController {
  constructor(private readonly service: InquiryWorkflowService) {}
  @Post(":id/replies") reply(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() d: CustomerReplyDto,
  ) {
    return this.service.act(r, id, d, true);
  }
  @Get(":id/actions/:key") resolve(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Param("key") key: string,
  ) {
    return this.service.resolve(r, id, key, true);
  }
}
@Module({
  imports: [AuthModule, DatabaseModule, InquiryModule],
  controllers: [StaffInquiryController, CustomerConversationController],
  providers: [
    InquiryWorkflowService,
    StaffInquiryBoundary,
    CustomerConversationBoundary,
    {
      provide: WORKFLOW_CONFIG,
      inject: [ENVIRONMENT, AUTH_CONFIG],
      useFactory: (env: Environment, config: AuthConfig) =>
        workflowConfiguration(env, process.env, config.mode),
    },
  ],
})
export class InquiryWorkflowModule {}
