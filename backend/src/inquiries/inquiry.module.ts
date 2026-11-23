import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AuthService, type AuthRequest } from "../auth/auth.service.js";
import { DatabaseModule } from "../database/database.module.js";
import { InquiryService } from "./inquiry.service.js";
import { CreateInquiryDto, SaveInquiryDto, SubmitInquiryDto } from "./inquiry.dto.js";
import { InquiryNotifications } from "./notifications.service.js";
@Injectable()
class InquiryBoundary implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(c: ExecutionContext) {
    const req = c.switchToHttp().getRequest<AuthRequest>();
    await this.auth.boundary(req, req.method === "GET");
    this.auth.require(req, ["customer"]);
    return true;
  }
}
@Controller("account/inquiries")
@UseGuards(InquiryBoundary)
class InquiryController {
  constructor(private readonly service: InquiryService) {}
  @Get() list(@Req() r: AuthRequest) {
    return this.service.list(r);
  }
  @Get("counts") counts(@Req() r: AuthRequest) {
    return this.service.counts(r);
  }
  @Post() create(@Req() r: AuthRequest, @Body() d: CreateInquiryDto) {
    return this.service.create(r, d);
  }
  @Get(":id") detail(@Req() r: AuthRequest, @Param("id") id: string) {
    return this.service.detail(r, id);
  }
  @Patch(":id") save(@Req() r: AuthRequest, @Param("id") id: string, @Body() d: SaveInquiryDto) {
    return this.service.save(r, id, d);
  }
  @Post(":id/submit") submit(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() d: SubmitInquiryDto,
  ) {
    return this.service.submit(r, id, d);
  }
}
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [InquiryController],
  providers: [InquiryService, InquiryBoundary, InquiryNotifications],
})
export class InquiryModule {}
