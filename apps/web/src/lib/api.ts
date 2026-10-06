import type { HealthResponse } from '@qrguard/types';
import 'server-only';

// Server-side URL for the API (inside Docker this is http://api:4000).
const API_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/** Error from the API, with a message that is safe to show to the user. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// NestJS sends { message: string | string[] } on errors.
function errorMessage(body: unknown, status: number): string {
  const msg = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(msg)) return msg.join('. ');
  if (typeof msg === 'string') return msg;
  return status >= 500 ? 'Something went wrong. Please try again.' : 'Request failed.';
}

/** Calls the API from the Next.js server. Throws ApiError on a non-2xx answer. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      ...rest,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(503, 'Cannot reach the QRGuard server. Please try again.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, res.status));
  return body as T;
}

// Reads API health. Returns null if the API cannot be reached.
export async function getApiHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    // The API sends 503 with a body when a service is down.
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}
