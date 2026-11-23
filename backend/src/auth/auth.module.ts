import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Inject,
  Injectable,
  Module,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { DatabaseModule } from "../database/database.module.js";
import { ENVIRONMENT } from "../config/configuration.module.js";
import type { Environment } from "../config/environment.js";
import { AUTH_CONFIG, authConfiguration } from "./auth.config.js";
import { AuthService, type AuthRequest } from "./auth.service.js";
import { AuthRateLimit } from "./rate-limit.js";
import { MailService } from "./mail.service.js";
import {
  ChangePasswordDto,
  EmailDto,
  LoginDto,
  ProfileDto,
  RegisterDto,
  ResetDto,
  TokenDto,
} from "./auth.dto.js";

@Injectable()
export class AuthBoundary implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    await this.auth.boundary(context.switchToHttp().getRequest());
    return true;
  }
}
// Future inquiry endpoints must use this guard, not frontend verification flags.
@Injectable()
export class VerifiedCustomerGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    await this.auth.boundary(req);
    this.auth.requireVerified(req);
    return true;
  }
}
@Controller()
@UseGuards(AuthBoundary)
class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get("auth/session") current(@Req() r: AuthRequest, @Res({ passthrough: true }) s: Response) {
    return this.auth.current(r, s);
  }
  @Post("auth/register") register(@Req() r: AuthRequest, @Body() d: RegisterDto) {
    return this.auth.register(r, d);
  }
  @Post("auth/login") login(
    @Req() r: AuthRequest,
    @Body() d: LoginDto,
    @Res({ passthrough: true }) s: Response,
  ) {
    return this.auth.login(r, s, d);
  }
  @Post("auth/logout") logout(@Req() r: AuthRequest, @Res({ passthrough: true }) s: Response) {
    return this.auth.logout(r, s);
  }
  @Post("auth/verification/resend") resend(@Req() r: AuthRequest, @Body() d: EmailDto) {
    return this.auth.requestMail(r, d, "verify");
  }
  @Post("auth/verification/confirm") verify(@Req() r: AuthRequest, @Body() d: TokenDto) {
    return this.auth.verify(r, d.token);
  }
  @Post("auth/password/forgot") forgot(@Req() r: AuthRequest, @Body() d: EmailDto) {
    return this.auth.requestMail(r, d, "reset");
  }
  @Post("auth/password/reset") reset(@Req() r: AuthRequest, @Body() d: ResetDto) {
    return this.auth.reset(r, d);
  }
  @Get("account/profile") profile(@Req() r: AuthRequest) {
    return this.auth.profileRead(r);
  }
  @Patch("account/profile") update(@Req() r: AuthRequest, @Body() d: ProfileDto) {
    return this.auth.profileUpdate(r, d);
  }
  @Post("account/password") password(
    @Req() r: AuthRequest,
    @Body() d: ChangePasswordDto,
    @Res({ passthrough: true }) s: Response,
  ) {
    return this.auth.changePassword(r, d, s);
  }
  @Get("staff/access") staff(@Req() r: AuthRequest) {
    const user = this.auth.require(r, ["administrator", "sales", "content_editor"]);
    return { role: user.role, permissions: permissions[user.role] ?? [] };
  }
}
export const permissions: Record<string, readonly string[]> = {
  administrator: ["staff:access", "employees:manage", "catalog:manage", "inquiries:manage"],
  sales: ["staff:access", "inquiries:manage"],
  content_editor: ["staff:access", "catalog:manage"],
};
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthBoundary,
    VerifiedCustomerGuard,
    AuthRateLimit,
    MailService,
    {
      provide: AUTH_CONFIG,
      inject: [ENVIRONMENT],
      useFactory: (env: Environment) => authConfiguration(env),
    },
  ],
  exports: [
    AuthService,
    AuthBoundary,
    VerifiedCustomerGuard,
    MailService,
    AuthRateLimit,
    AUTH_CONFIG,
  ],
})
export class AuthModule {}
