import { Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
@Injectable()
export class AuthBoundary implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    await this.auth.boundary(context.switchToHttp().getRequest());
    return true;
  }
}
