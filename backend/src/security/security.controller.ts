import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthBoundary } from "../auth/auth.boundary.js";
import type { AuthRequest } from "../auth/auth.service.js";
import { MfaService } from "./mfa.service.js";
@Controller("staff-security")
@UseGuards(AuthBoundary)
export class SecurityController {
  constructor(readonly mfa: MfaService) {}
  @Get("status") status(@Req() r: AuthRequest) {
    return this.mfa.status(r);
  }
  @Post("enrollment") enrollment(@Req() r: AuthRequest, @Body() d: unknown) {
    return this.mfa.begin(r, d);
  }
  @Post("enrollment/confirm") confirm(
    @Req() r: AuthRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() d: unknown,
  ) {
    return this.mfa.confirm(r, s, d);
  }
  @Post("challenge") challenge(
    @Req() r: AuthRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() d: unknown,
  ) {
    return this.mfa.challenge(r, s, d);
  }
  @Post("reauthenticate") recent(
    @Req() r: AuthRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() d: unknown,
  ) {
    return this.mfa.sensitive(r, s, d, "reauthenticate");
  }
  @Post("recovery-codes") recovery(
    @Req() r: AuthRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() d: unknown,
  ) {
    return this.mfa.sensitive(r, s, d, "recovery");
  }
  @Post("password") password(
    @Req() r: AuthRequest,
    @Res({ passthrough: true }) s: Response,
    @Body() d: unknown,
  ) {
    return this.mfa.sensitive(r, s, d, "password");
  }
}
