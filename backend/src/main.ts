import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { ENVIRONMENT } from "./config/configuration.module.js";
import { ConfigurationError, type Environment } from "./config/environment.js";
import { configureHttp } from "./http/configure-http.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: false,
    abortOnError: false,
  });
  try {
    const env = app.get<Environment>(ENVIRONMENT);
    configureHttp(app, env);
    app.enableShutdownHooks(
      process.platform === "win32" ? ["SIGINT", "SIGBREAK"] : ["SIGINT", "SIGTERM"],
    );
    const server = app.getHttpServer();
    server.requestTimeout = 15_000;
    server.headersTimeout = 10_000;
    server.keepAliveTimeout = 5_000;
    await app.listen(env.port, env.host);
    process.stdout.write("VOIC backend listening.\n");
  } catch (error) {
    await app.close();
    throw error;
  }
}

bootstrap().catch((error) => {
  process.stderr.write(
    error instanceof ConfigurationError
      ? `${error.message}\n`
      : "Backend startup failed. Check the documented environment and port settings.\n",
  );
  process.exitCode = 1;
});
