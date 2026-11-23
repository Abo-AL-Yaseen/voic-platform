import { Controller, Get, Module, Param, Query } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { CatalogService } from "./catalog.service.js";
import { parseCatalogQuery } from "./catalog.query.js";

@Controller("products")
class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get() list(@Query() raw: Record<string, unknown>) {
    return this.catalog.list(
      parseCatalogQuery(raw, [
        "lang",
        "q",
        "category",
        "brand",
        "usage",
        "size",
        "use",
        "sort",
        "page",
        "pageSize",
      ]),
    );
  }
  @Get("filters") filters(@Query() raw: Record<string, unknown>) {
    return this.catalog.filters(parseCatalogQuery(raw, ["lang", "use"]));
  }
  @Get("featured") featured(@Query() raw: Record<string, unknown>) {
    return this.catalog.featured(parseCatalogQuery(raw, ["lang"]).lang);
  }
  @Get("lookup") lookup(@Query() raw: Record<string, unknown>) {
    const q = parseCatalogQuery(raw, ["lang", "ids"]);
    return this.catalog.lookup(q.ids, q.lang);
  }
  @Get(":id/related") related(@Param("id") id: string, @Query() raw: Record<string, unknown>) {
    return this.catalog.related(id, parseCatalogQuery(raw, ["lang"]).lang);
  }
  @Get(":id") detail(@Param("id") id: string, @Query() raw: Record<string, unknown>) {
    return this.catalog.detail(id, parseCatalogQuery(raw, ["lang"]).lang);
  }
}
@Module({
  imports: [DatabaseModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
