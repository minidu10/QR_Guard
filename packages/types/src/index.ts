// Shared types used by the API and the web app.

/** User roles in QRGuard. */
export type Role = 'customer' | 'owner' | 'admin';

/** All roles, handy for validation. */
export const ROLES: readonly Role[] = ['customer', 'owner', 'admin'];

/** Status of one service in a health check. */
export type ServiceStatus = 'up' | 'down';

/** Shape returned by GET /api/v1/health. */
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: Record<string, ServiceStatus>;
}

/** A user as the API returns it (never includes the password). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  createdAt: string;
}

/** Returned by register, login and refresh. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

/** GeoJSON point. Coordinates are [longitude, latitude]. */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface Shop {
  id: string;
  name: string;
  ownerId: string;
  address: string;
  location: GeoPoint;
  verified: boolean;
  riskScore: number;
  createdAt: string;
}

/** A shop in a nearby search, with distance in metres. */
export interface NearbyShop extends Shop {
  distanceMeters: number;
}

export type QrCodeStatus = 'active' | 'revoked';

export interface QrCode {
  id: string;
  shopId: string;
  merchantId: string;
  qrPayload: string;
  status: QrCodeStatus;
  createdAt: string;
}

/** Returned when a QR code is generated. Includes a PNG image as a data URL. */
export interface GeneratedQrCode extends QrCode {
  qrImage: string;
}
