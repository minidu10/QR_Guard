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

export interface Shop {
  id: string;
  name: string;
  ownerId: string;
  address: string;
  lat: number;
  lng: number;
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
  revokedAt: string | null;
  createdAt: string;
}

/** Returned when a QR code is generated. Includes a PNG image as a data URL. */
export interface GeneratedQrCode extends QrCode {
  qrImage: string;
}

/** A QR code in a shop's list. Only active codes include the image. */
export interface QrCodeListItem extends QrCode {
  qrImage: string | null;
}

/** Why a scan is safe or not. */
export type ScanReason =
  'OK' | 'NOT_PAYMENT_QR' | 'BAD_CHECKSUM' | 'UNKNOWN_MERCHANT' | 'REVOKED_QR' | 'WRONG_SHOP';

/** Short shop info shown on the scan result screen. */
export interface ShopSummary {
  id: string;
  name: string;
  address: string;
  verified: boolean;
}

/** Returned by POST /scan. */
export interface ScanResponse {
  scanId: string;
  safe: boolean;
  reason: ScanReason;
  /** Simple English message for the customer. */
  message: string;
  /** The shop that owns the scanned QR code (null if unknown). */
  shop: ShopSummary | null;
  /** The shop the customer is at (picked, or the nearest one). */
  expectedShop: ShopSummary | null;
  /** Merchant name written inside the QR (a fake QR can copy the real name). */
  qrMerchantName: string | null;
  /** Merchant id inside the QR (used to make a demo payment after a safe scan). */
  merchantId: string | null;
}

export type AlertType = 'SCAN_MISMATCH' | 'TAMPER_DETECTED' | 'PAYMENT_DROP' | 'CUSTOMER_REPORT';

export type Severity = 'low' | 'medium' | 'high';

export interface Alert {
  id: string;
  shopId: string;
  type: AlertType;
  severity: Severity;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

/** An alert with the shop name (used in lists that mix shops). */
export interface AlertWithShop extends Alert {
  shopName: string;
}

export type PaymentStatus = 'success' | 'failed';

/** A fake payment. QRGuard never touches real money. */
export interface Payment {
  id: string;
  shopId: string;
  merchantId: string;
  /** Whole rupees (LKR). */
  amount: number;
  customerRef: string;
  status: PaymentStatus;
  createdAt: string;
}

/** Payments per Sri Lanka hour: today, and the normal level (average of the last 7 days). */
export interface PaymentSummary {
  today: { count: number; total: number };
  hourly: { hour: number; count: number; typical: number }[];
}

/** Short-lived ticket for the live (Socket.io) connection. */
export interface RealtimeTicket {
  ticket: string;
  /** Where the browser should connect. */
  url: string;
}

/** Events sent from the API to the browser. */
export interface RealtimeEvents {
  alert: (alert: AlertWithShop) => void;
  payment: (payment: Payment) => void;
}
