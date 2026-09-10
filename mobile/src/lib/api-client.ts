// Mobile (Phase mobile-M1) — the mobile app's own data-transport module,
// playing the same role /src/lib/api-client.ts plays for the web app: the
// one place that calls the existing Next.js /api/* backend. No business
// logic lives here — only request plumbing (attaching the session, parsing
// JSON, distinguishing auth/network/other errors) — every actual resource
// call (dogs, health records, etc.) belongs to later phases, not M1.
import type { ZodType } from "zod";
import { getStoredSessionCookie } from "./auth-client";
import { env } from "./env";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** The backend responded 401 — the stored session is missing/expired. */
export class UnauthorizedError extends ApiError {
  constructor(body: unknown) {
    super("Not authenticated", 401, body);
    this.name = "UnauthorizedError";
  }
}

/** fetch() itself failed — offline, DNS, timeout, TLS, etc. — not an HTTP error response. */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Network request failed");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

type ApiFetchOptions<T> = RequestInit & {
  /** When provided, the JSON body is parsed+validated via schema.parse rather than an unchecked cast. */
  schema?: ZodType<T>;
  /** Skip attaching the stored session cookie — for the rare unauthenticated call. */
  skipAuth?: boolean;
};

// Overload 1: no schema — unchecked cast (use only when there is no contract).
export async function apiFetch<T>(
  path: string,
  options?: Omit<ApiFetchOptions<T>, "schema">,
): Promise<T>;
// Overload 2: with schema — parsed + validated, T inferred from the schema.
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions<T> & { schema: ZodType<T> },
): Promise<T>;
export async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions<T>,
): Promise<T> {
  const { schema, skipAuth, ...init } = options ?? {};
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");

  if (!skipAuth) {
    const cookie = await getStoredSessionCookie();
    if (cookie) {
      headers.set("cookie", cookie);
    }
  }

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}`, { ...init, headers });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  const body = await res.json().catch(() => null);

  if (res.status === 401) {
    throw new UnauthorizedError(body);
  }
  if (!res.ok) {
    throw new ApiError(
      `apiFetch ${path} failed (${res.status})`,
      res.status,
      body,
    );
  }

  return schema ? schema.parse(body) : (body as T);
}
