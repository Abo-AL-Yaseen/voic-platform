import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import express from "express";
import helmet from "helmet";
import type { Environment } from "../config/environment.js";
import { ApiErrorFilter } from "./error.filter.js";
import { AuthRateLimit } from "../auth/rate-limit.js";
import { DatabaseService } from "../database/database.service.js";
import { ServiceUnavailableException } from "@nestjs/common";

export function configureHttp(app: NestExpressApplication, env: Environment): void {
  app.setGlobalPrefix("api/v1");
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app
    .getHttpAdapter()
    .getInstance()
    .set("trust proxy", [...env.trustProxy]);
  app.use((request: express.Request, response: express.Response, next: express.NextFunction) => {
    const started = performance.now();
    response.setHeader("X-Request-Id", randomUUID());
    response.setHeader("Cache-Control", "no-store");
    if (env.nodeEnv === "production")
      response.once("finish", () => {
        // No URL, route parameter, IP, identity, query, body or header values are logged.
        process.stdout.write(
          JSON.stringify({
            event: "http_complete",
            requestId: response.getHeader("X-Request-Id"),
            method: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(
              request.method,
            )
              ? request.method
              : "OTHER",
            statusCode: response.statusCode,
            durationMs: Math.round(performance.now() - started),
          }) + "\n",
        );
      });
    next();
  });
  if (env.nodeEnv === "production") {
    const limits = app.get(AuthRateLimit),
      database = app.get(DatabaseService);
    app.use(async (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (/^\/api\/v1\/health\/(live|ready)$/.test(req.path)) return next();
      try {
        if (!(await database.isReady())) throw new ServiceUnavailableException();
        await limits.take("http", req.ip || req.socket.remoteAddress || "unknown", 600, 60_000);
        next();
      } catch (error) {
        next(error);
      }
    });
  }
  app.use(helmet({ strictTransportSecurity: env.nodeEnv === "production" ? undefined : false }));
  app.enableCors({
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    exposedHeaders: ["X-Request-Id"],
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) callback(null, true);
      else callback(new ForbiddenException(), false);
    },
    maxAge: 600,
  });
  app.use("/api/v1/staff/content/media/upload", express.json({ limit: "7mb", strict: true }));
  app.use(express.json({ limit: "64kb", strict: true }));
  app.use(express.urlencoded({ limit: "64kb", extended: false, parameterLimit: 100 }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
      exceptionFactory: () => new BadRequestException(),
    }),
  );
  app.useGlobalFilters(new ApiErrorFilter());
}
