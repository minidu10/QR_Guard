// The scan check rules. Pure functions, so they are easy to test.
import type { ScanReason, Severity } from '@qrguard/types';
import type { ParsedQr } from '../qrcodes/emv';

/** Our QR code that has the scanned merchant id. */
export interface MatchedQr {
  shopId: string;
  status: 'active' | 'revoked';
}

export interface ScanDecision {
  safe: boolean;
  reason: ScanReason;
}

/**
 * Decides if a scanned QR is safe to pay.
 * `expectedShopIds`: the shop the customer picked, or the shops near the customer.
 * Empty means we do not know where the customer is.
 */
export function decideScan(input: {
  parsed: ParsedQr | null;
  match: MatchedQr | null;
  expectedShopIds: string[];
}): ScanDecision {
  const { parsed, match, expectedShopIds } = input;
  const warn = (reason: ScanReason): ScanDecision => ({ safe: false, reason });

  if (!parsed?.merchantId) return warn('NOT_PAYMENT_QR');
  // Someone changed the text inside the QR.
  if (!parsed.validCrc) return warn('BAD_CHECKSUM');
  // Not one of our shops' QR codes: most likely a scammer's sticker.
  if (!match) return warn('UNKNOWN_MERCHANT');
  if (match.status === 'revoked') return warn('REVOKED_QR');
  // A real QR, but it belongs to another shop.
  if (expectedShopIds.length > 0 && !expectedShopIds.includes(match.shopId)) {
    return warn('WRONG_SHOP');
  }
  return { safe: true, reason: 'OK' };
}

/** Simple English message for the customer. */
export function scanMessage(
  reason: ScanReason,
  names: { shop?: string; expectedShop?: string } = {},
): string {
  switch (reason) {
    case 'OK':
      return `This QR code belongs to ${names.shop ?? 'this shop'}. It is safe to pay.`;
    case 'NOT_PAYMENT_QR':
      return 'This is not a shop payment QR code. Do not pay with it.';
    case 'BAD_CHECKSUM':
      return 'This QR code has been changed. Do not pay. Please tell the shop owner.';
    case 'UNKNOWN_MERCHANT':
      return 'This QR code is not registered to any shop. It may be a fake sticker. Do not pay.';
    case 'REVOKED_QR':
      return `This is an old QR code that ${names.shop ?? 'the shop'} no longer uses. Do not pay. Ask for the current QR code.`;
    case 'WRONG_SHOP':
      return `This QR code belongs to ${names.shop ?? 'another shop'}, not ${names.expectedShop ?? 'this shop'}. Do not pay.`;
  }
}

/** Which shop to warn about a bad scan, and how serious it is. Null = no alert. */
export function alertTarget(input: {
  decision: ScanDecision;
  match: MatchedQr | null;
  // The shop the customer is at, and whether they picked it themselves.
  expectedShopId: string | null;
  pickedByCustomer: boolean;
}): { shopId: string; severity: Severity } | null {
  const { decision, match, expectedShopId, pickedByCustomer } = input;
  if (decision.safe) return null;

  // An old QR is still being used: tell the shop that owns it.
  if (decision.reason === 'REVOKED_QR' && match) {
    return { shopId: match.shopId, severity: 'medium' };
  }
  if (!expectedShopId) return null;
  // Any QR (even a website link) can be stuck on a stand. Only warn if the
  // customer said they are at this shop, so random scans do not cause alerts.
  if (decision.reason === 'NOT_PAYMENT_QR' && !pickedByCustomer) return null;
  // The customer picked the shop: we are sure. Found by location: less sure.
  return { shopId: expectedShopId, severity: pickedByCustomer ? 'high' : 'medium' };
}

/** Simple English alert text for the shop owner. */
export function ownerAlertMessage(
  reason: ScanReason,
  opts: { pickedByCustomer: boolean; merchantId?: string | null; otherShop?: string },
): string {
  const where = opts.pickedByCustomer ? 'at your shop' : 'at or near your shop';
  switch (reason) {
    case 'UNKNOWN_MERCHANT':
      return `A customer scanned a QR code ${where} that is not yours (merchant ${opts.merchantId ?? 'unknown'}). Check your QR stand for a fake sticker now.`;
    case 'BAD_CHECKSUM':
      return `A customer scanned a changed QR code ${where}. Check your QR stand now.`;
    case 'WRONG_SHOP':
      return `A customer scanned the QR code of another shop (${opts.otherShop ?? 'unknown'}) ${where}. Check your QR stand now.`;
    case 'NOT_PAYMENT_QR':
      return `A customer scanned a QR code ${where} that is not a payment QR. Check your QR stand.`;
    case 'REVOKED_QR':
      return 'A customer scanned one of your old (revoked) QR codes. Remove old QR stickers from your shop.';
    case 'OK':
      return 'Scan was safe.';
  }
}
