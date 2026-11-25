import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
  Body,
  Module,
  Injectable,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthModule } from "../auth/auth.module.js";
import { AuthService, type AuthRequest } from "../auth/auth.service.js";
import { DatabaseModule } from "../database/database.module.js";
import { ContentService } from "./content.service.js";
import { ContentMediaService, LocalMediaStorage } from "./media.service.js";
@Injectable()
class ContentBoundary implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly content: ContentService,
  ) {}
  async canActivate(c: ExecutionContext) {
    const r = c.switchToHttp().getRequest<AuthRequest>();
    await this.auth.boundary(r, r.method === "GET");
    this.content.staff(r);
    return true;
  }
}
@Controller("staff/content")
@UseGuards(ContentBoundary)
class StaffContentController {
  constructor(
    private readonly content: ContentService,
    private readonly media: ContentMediaService,
  ) {}
  @Get("metadata") metadata(@Req() r: AuthRequest) {
    return this.content.metadata(r);
  }
  @Get("media") mediaList(@Req() r: AuthRequest) {
    return this.media.list(r);
  }
  @Get("media/:id/usage") usage(@Req() r: AuthRequest, @Param("id") id: string) {
    return this.media.usage(r, id);
  }
  @Get("media/:id/preview") async preview(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    res.type("image/webp").send(await this.media.previewFile(r, id));
  }
  @Post("media/upload") upload(@Req() r: AuthRequest, @Body() b: Record<string, unknown>) {
    return this.media.upload(r, b);
  }
  @Post("media/:id/actions") mediaAction(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.media.mutate(r, id, b);
  }
  @Get(":kind") list(@Req() r: AuthRequest, @Param("kind") kind: string) {
    return this.content.list(r, this.content.kind(kind));
  }
  @Get(":kind/:id") detail(
    @Req() r: AuthRequest,
    @Param("kind") kind: string,
    @Param("id") id: string,
  ) {
    return this.content.detail(r, this.content.kind(kind), id);
  }
  @Post(":kind/:id/actions") action(
    @Req() r: AuthRequest,
    @Param("kind") kind: string,
    @Param("id") id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.content.mutate(r, this.content.kind(kind), id, b);
  }
}
@Controller()
class PublicContentController {
  constructor(
    private readonly content: ContentService,
    private readonly media: ContentMediaService,
  ) {}
  @Get("recipes") list(@Query() q: Record<string, unknown>) {
    return this.content.publicDocs("recipes", q);
  }
  @Get("recipes/:id") recipe(@Param("id") id: string, @Query() q: Record<string, unknown>) {
    return this.content.publicDocs("recipes", q, id);
  }
  @Get("content/:id") page(@Param("id") id: string, @Query() q: Record<string, unknown>) {
    return this.content.publicDocs("pages", q, id);
  }
  @Get("media/:file") async file(@Param("file") file: string, @Res() res: Response) {
    res.type("image/webp").send(await this.media.publicFile(file));
  }
}
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [StaffContentController, PublicContentController],
  providers: [ContentService, ContentMediaService, LocalMediaStorage, ContentBoundary],
})
export class ContentModule {}
