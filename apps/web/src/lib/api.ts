import type { HealthResponse } from '@qrguard/types';

// Server-side URL for the API (inside Docker this is http://api:4000).
const API_URL = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

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
