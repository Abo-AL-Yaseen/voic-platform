import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ContentService, editorLock } from "./content.service.js";
import { ContentMedia, ContentMediaUsage } from "./content.entities.js";
import { bad, exact, text } from "./content.validation.js";
import type { AuthRequest } from "../auth/auth.service.js";
@Injectable()
export class LocalMediaStorage {
  private active = 0;
  root() {
    const test = process.env.NODE_ENV === "test";
    const name = process.env.MEDIA_TEST_NAME || "default";
    if (test && !/^[a-zA-Z0-9_-]{1,60}$/.test(name))
      throw new Error("Invalid isolated media directory");
    return path.resolve(test ? `.tmp/media-test-${name}` : ".local-data/media");
  }
  async rootReady() {
    const root = this.root();
    await fs.mkdir(root, { recursive: true });
    if ((await fs.realpath(root)) !== root || (await fs.lstat(root)).isSymbolicLink())
      throw new Error("Media root must be a real directory");
    return root;
  }
  async process(input: any) {
    if (this.active >= 2) throw new BadRequestException({ code: "MEDIA_BUSY" });
    this.active++;
    try {
      exact(input, ["key", "filename", "data", "altAr", "altEn"]);
      text(input.filename, 120);
      text(input.altAr, 300);
      text(input.altEn, 300);
      if (
        !input.altAr.trim() ||
        !input.altEn.trim() ||
        !/^[A-Za-z0-9 _.-]+\.(png|jpe?g|webp)$/i.test(input.filename) ||
        input.filename.includes("..") ||
        typeof input.data !== "string" ||
        input.data.length > 7000000 ||
        input.data.length % 4 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(input.data)
      )
        bad();
      const data = Buffer.from(input.data, "base64");
      if (!data.length || data.length > 5 * 1024 * 1024 || data.toString("base64") !== input.data)
        bad();
      const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255,
        webp = data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
      if (!png && !jpeg && !webp) bad();
      const pipeline = sharp(data, {
        limitInputPixels: 24000000,
        failOn: "warning",
        animated: false,
      });
      const meta = await pipeline.metadata();
      if (
        !["png", "jpeg", "webp"].includes(meta.format || "") ||
        (meta.pages || 1) !== 1 ||
        !meta.width ||
        !meta.height ||
        meta.width > 6000 ||
        meta.height > 6000 ||
        meta.width * meta.height > 24000000
      )
        bad();
      return await pipeline.rotate().webp({ quality: 90 }).timeout({ seconds: 5 }).toBuffer();
    } catch {
      throw new BadRequestException({ code: "MEDIA_INVALID" });
    } finally {
      this.active--;
    }
  }
  async put(filename: string, data: Buffer) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(filename)) throw new Error("Invalid owned media filename");
    const root = await this.rootReady();
    const marker = path.join(root, `.owned-${filename}.json`);
    const journal = await fs.open(marker, "wx", 0o600);
    try {
      await journal.writeFile(JSON.stringify({ filename, createdAt: new Date().toISOString() }));
    } catch (error) {
      await fs.unlink(marker).catch(() => {});
      throw error;
    } finally {
      await journal.close();
    }
    let file;
    try {
      file = await fs.open(path.join(root, filename), "wx", 0o600);
      await file.writeFile(data);
      await file.close();
    } catch (e) {
      if (file) {
        await file.close().catch(() => {});
        await fs.unlink(path.join(root, filename)).catch(() => {});
      }
      await fs.unlink(marker).catch(() => {});
      throw e;
    }
  }
  async get(filename: string) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(filename)) throw new NotFoundException();
    try {
      const root = await this.rootReady(),
        file = path.join(root, filename);
      if (!(await fs.lstat(file)).isFile() || (await fs.realpath(file)) !== file) throw new Error();
      return await fs.readFile(file);
    } catch {
      throw new NotFoundException();
    }
  }
  async remove(filename: string) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(filename)) throw new Error("Invalid owned media filename");
    const file = path.join(await this.rootReady(), filename);
    try {
      if (!(await fs.lstat(file)).isFile() || (await fs.realpath(file)) !== file)
        throw new Error("Invalid owned media file");
      await fs.unlink(file);
      await fs.unlink(path.join(this.root(), `.owned-${filename}.json`)).catch(() => {});
    } catch (e: any) {
      if (e?.code !== "ENOENT") throw e;
    }
  }
}
@Injectable()
export class ContentMediaService {
  constructor(
    readonly content: ContentService,
    readonly storage: LocalMediaStorage,
  ) {}
  async list(req: AuthRequest) {
    this.content.staff(req);
    if (Object.keys(req.query).some((k) => !["q", "status", "page", "pageSize"].includes(k))) bad();
    const f = this.content.filters(req.query);
    const b = this.content.source.getRepository(ContentMedia).createQueryBuilder("m");
    if (f.q)
      b.where(
        "(m.altAr LIKE :q ESCAPE '!' OR m.altEn LIKE :q ESCAPE '!' OR m.id LIKE :q ESCAPE '!')",
        { q: `%${f.q.replace(/[%_!]/g, "!$&")}%` },
      );
    const [items, total] = await b
      .orderBy("m.createdAt", "DESC")
      .addOrderBy("m.id", "ASC")
      .skip((f.page - 1) * f.pageSize)
      .take(f.pageSize)
      .getManyAndCount();
    return {
      items,
      total,
      page: f.page,
      pageSize: f.pageSize,
      totalPages: Math.max(1, Math.ceil(total / f.pageSize)),
      permissions: this.content.permissions(req),
    };
  }
  async usage(req: AuthRequest, id: string) {
    this.content.staff(req);
    const media = await this.content.source.getRepository(ContentMedia).findOneBy({ id });
    if (!media) throw new NotFoundException();
    const [items, total] = await this.content.source.getRepository(ContentMediaUsage).findAndCount({
      where: { mediaId: id },
      order: { documentKey: "ASC", revisionId: "ASC" },
      take: 50,
    });
    return { media, items, total, retainedRevisionsIncluded: true };
  }
  async upload(req: AuthRequest, input: any) {
    // Authorize/rate-limit before image decoding. A receipt protects a repeated upload.
    this.content.staff(req);
    if (!this.content.permissions(req).canWrite)
      throw new BadRequestException({ code: "STAFF_WRITES_DISABLED" });
    this.content.limits.take("media-upload", this.content.staff(req).id, 20);
    const data = await this.storage.process(input);
    let written: string | undefined;
    try {
      return await this.content.write(req, async (m, u) => {
        const target = "media:upload",
          body = { ...input, action: "upload" },
          old = await this.content.receipt(
            m,
            u.id,
            input.key,
            this.content.fingerprint(target, body),
          );
        if (old) return m.findOneByOrFail(ContentMedia, { id: old.revisionId! });
        const id = randomUUID(),
          filename = `${id}.webp`;
        await this.storage.put(filename, data);
        written = filename;
        const media = m.create(ContentMedia, {
          id,
          url: `/api/v1/media/${filename}`,
          filename,
          source: "upload",
          altAr: input.altAr.trim(),
          altEn: input.altEn.trim(),
          version: 1,
          archived: false,
          createdAt: new Date(),
        });
        await m.insert(ContentMedia, media);
        await this.content.audit(m, u, target, body, 1, id);
        return media;
      });
    } catch (e) {
      if (written) await this.storage.remove(written);
      throw e;
    }
  }
  async mutate(req: AuthRequest, id: string, input: any) {
    exact(input, ["key", "version", "action", "altAr", "altEn"]);
    if (!["save", "archive", "delete"].includes(input.action) || !Number.isInteger(input.version))
      bad();
    let removed: string | null = null;
    const result = await this.content.write(req, async (m, u) => {
      const target = `media:${id}`,
        old = await this.content.receipt(
          m,
          u.id,
          input.key,
          this.content.fingerprint(target, input),
        );
      if (old) return { completed: true };
      const media = await m.findOneBy(ContentMedia, { id });
      if (!media) throw new NotFoundException();
      if (media.version !== input.version)
        throw new ConflictException({ code: "CONTENT_CONFLICT" });
      if (input.action === "save") {
        text(input.altAr, 300);
        text(input.altEn, 300);
        media.altAr = input.altAr.trim();
        media.altEn = input.altEn.trim();
        media.version++;
        await m.save(media);
      } else {
        const referenced = await m.countBy(ContentMediaUsage, { mediaId: id });
        const [snapshots] = await m.query(
          "SELECT COUNT(*) n FROM customer_inquiry_lines WHERE CAST(snapshot AS CHAR) LIKE ?",
          [`%${media.url.replace(/[\\%_]/g, "\\$&")}%`],
        );
        if (referenced || Number(snapshots.n))
          throw new ConflictException({ code: "CONTENT_REFERENCE" });
        if (input.action === "delete") {
          if (media.source !== "upload") throw new ConflictException({ code: "CONTENT_REFERENCE" });
          removed = media.filename;
          await m.delete(ContentMedia, { id });
        } else {
          media.archived = true;
          media.version++;
          await m.save(media);
        }
      }
      await this.content.audit(m, u, target, input, media.version, null);
      return { completed: true };
    });
    if (removed) await this.storage.remove(removed);
    return result;
  }
  async publicFile(filename: string) {
    await this.content.ready();
    const media = await this.content.source
      .getRepository(ContentMedia)
      .findOneBy({ filename, archived: false });
    if (!media) throw new NotFoundException();
    const [used] = await this.content.source.query(
      `SELECT COUNT(*) n FROM content_media_usage u JOIN content_documents d ON d.publishedId=u.revisionId WHERE u.mediaId=? AND d.archived=0 ${this.content.env.nodeEnv === "production" ? "AND d.approvalScope='approved'" : ""}`,
      [media.id],
    );
    if (!Number(used.n)) throw new NotFoundException();
    return this.storage.get(filename);
  }
  async previewFile(req: AuthRequest, id: string) {
    this.content.staff(req);
    const m = await this.content.source.getRepository(ContentMedia).findOneBy({ id });
    if (!m || !m.filename) throw new NotFoundException();
    return this.storage.get(m.filename);
  }
}
