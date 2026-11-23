import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";

const errors: Record<number, [string, string]> = {
  400: ["BAD_REQUEST", "The request is invalid."],
  401: ["UNAUTHORIZED", "Authentication is required."],
  403: ["FORBIDDEN", "The request is not allowed."],
  404: ["NOT_FOUND", "The resource was not found."],
  405: ["METHOD_NOT_ALLOWED", "The method is not allowed."],
  409: ["CONFLICT", "The record changed; reload before continuing."],
  413: ["PAYLOAD_TOO_LARGE", "The request body is too large."],
  415: ["UNSUPPORTED_MEDIA_TYPE", "The content type is not supported."],
  429: ["TOO_MANY_REQUESTS", "Too many requests."],
  503: ["SERVICE_UNAVAILABLE", "The service is not ready."],
};

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const parserType =
      typeof exception === "object" && exception !== null && "type" in exception
        ? exception.type
        : undefined;
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : parserType === "entity.too.large"
          ? 413
          : parserType === "entity.parse.failed"
            ? 400
            : 500;
    let [code, message] = errors[statusCode] ?? [
      "INTERNAL_ERROR",
      "The request could not be completed.",
    ];
    if ([400, 409, 403].includes(statusCode) && exception instanceof HttpException) {
      const detail = exception.getResponse();
      if (
        typeof detail === "object" &&
        detail &&
        "code" in detail &&
        [
          "TOKEN_INVALID",
          "TOKEN_EXPIRED",
          "TOKEN_USED",
          "INVALID_CURRENT_PASSWORD",
          "INQUIRY_UNAVAILABLE",
          "INQUIRY_FIELDS",
          "INQUIRY_CONFLICT",
          "IDEMPOTENCY_CONFLICT",
          "EMAIL_UNVERIFIED",
        ].includes(String(detail.code))
      )
        code = String(detail.code);
    }
    response.setHeader("Cache-Control", "no-store");
    if (statusCode === 429) response.setHeader("Retry-After", "900");
    response
      .status(statusCode)
      .json({ statusCode, code, message, requestId: response.getHeader("X-Request-Id") });
    // Deliberately excludes exception, SQL, URLs, headers, cookies and request bodies.
    if (statusCode >= 500)
      process.stderr.write(JSON.stringify({ event: "request_failed", statusCode }) + "\n");
  }
}
