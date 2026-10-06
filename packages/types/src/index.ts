// Shared types used by the API and the web app.

/** User roles in QRGuard. */
export type Role = 'customer' | 'owner' | 'admin';

/** Status of one service in a health check. */
export type ServiceStatus = 'up' | 'down';

/** Shape returned by GET /api/v1/health. */
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: Record<string, ServiceStatus>;
}
