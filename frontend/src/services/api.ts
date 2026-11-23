export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * Shared HTTP boundary. Public catalog consumers use this client; disconnected
 * account, inquiry submission and staff screens do not call invented endpoints.
 */
export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!baseUrl) throw new ApiError("API integration is not configured.", 0);
  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    throw new ApiError("The request could not be completed.", response.status, body);
  }
  return body as T;
}
