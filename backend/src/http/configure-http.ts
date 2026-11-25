import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import express from "express";
import helmet from "helmet";
import type { Environment } from "../config/environment.js";
import { ApiErrorFilter } from "./error.filter.js";

export function configureHttp(app: NestExpressApplication, env: Environment): void {
  app.setGlobalPrefix("api/v1");
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.use((_request: express.Request, response: express.Response, next: express.NextFunction) => {
    response.setHeader("X-Request-Id", randomUUID());
    response.setHeader("Cache-Control", "no-store");
    next();
  });
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
