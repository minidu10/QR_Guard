// Builds and reads EMVCo merchant QR payloads (the format LankaQR uses).
// A payload is a list of fields: 2-digit tag + 2-digit length + value.
// The last field (tag 63) is a CRC checksum, so a changed payload is easy to spot.
//
// QRGuard is a demo. Our merchant info uses a fake GUID, so it never works
// with a real bank app.

export const QRGUARD_GUID = 'LK.QRGUARD.DEMO';

const TAG = {
  formatIndicator: '00',
  initiationMethod: '01',
  merchantAccount: '26',
  categoryCode: '52',
  currency: '53',
  country: '58',
  merchantName: '59',
  merchantCity: '60',
  crc: '63',
} as const;

// Inside the merchant account field (tag 26).
const SUB_TAG = { guid: '00', merchantId: '01' } as const;

export interface MerchantQr {
  merchantId: string;
  merchantName: string;
  merchantCity: string;
  categoryCode?: string; // MCC, default 5999 (misc. retail)
}

export interface ParsedQr {
  merchantId: string | null;
  merchantName: string | null;
  merchantCity: string | null;
  guid: string | null;
  validCrc: boolean;
  fields: Record<string, string>;
}

function field(tag: string, value: string): string {
  if (value.length > 99) throw new Error(`Field ${tag} is too long`);
  return tag + value.length.toString().padStart(2, '0') + value;
}

// EMVCo text fields only allow simple characters.
function clean(value: string, max: number): string {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, max);
}

/** CRC-16/CCITT-FALSE, as hex (4 chars, upper case). */
export function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Makes a static merchant QR payload for a shop. */
export function buildMerchantQr(qr: MerchantQr): string {
  const account = field(SUB_TAG.guid, QRGUARD_GUID) + field(SUB_TAG.merchantId, qr.merchantId);
  const body =
    field(TAG.formatIndicator, '01') +
    field(TAG.initiationMethod, '11') + // 11 = static QR (same code for every payment)
    field(TAG.merchantAccount, account) +
    field(TAG.categoryCode, qr.categoryCode ?? '5999') +
    field(TAG.currency, '144') + // LKR
    field(TAG.country, 'LK') +
    field(TAG.merchantName, clean(qr.merchantName, 25) || 'MERCHANT') +
    field(TAG.merchantCity, clean(qr.merchantCity, 15) || 'SRI LANKA');
  // The CRC covers everything, including its own tag and length ("6304").
  const withCrcHeader = body + TAG.crc + '04';
  return withCrcHeader + crc16(withCrcHeader);
}

// Splits "TTLLvalue..." into { tag: value }. Returns null if the format is broken.
function readFields(data: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < data.length) {
    if (i + 4 > data.length) return null;
    const tag = data.slice(i, i + 2);
    const len = Number(data.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || !Number.isInteger(len)) return null;
    const value = data.slice(i + 4, i + 4 + len);
    if (value.length !== len) return null;
    out[tag] = value;
    i += 4 + len;
  }
  return out;
}

/** Reads any EMVCo QR payload. Returns null if it is not an EMVCo payload at all. */
export function parseMerchantQr(payload: string): ParsedQr | null {
  const fields = readFields(payload.trim());
  if (!fields || fields[TAG.formatIndicator] !== '01') return null;

  const crcStart = payload.trim().length - 4;
  const validCrc =
    fields[TAG.crc]?.length === 4 &&
    crc16(payload.trim().slice(0, crcStart)) === fields[TAG.crc].toUpperCase();

  // Merchant account info can be in any tag from 26 to 51.
  let guid: string | null = null;
  let merchantId: string | null = null;
  for (let t = 26; t <= 51; t++) {
    const raw = fields[String(t)];
    const sub = raw ? readFields(raw) : null;
    if (sub?.[SUB_TAG.merchantId]) {
      guid = sub[SUB_TAG.guid] ?? null;
      merchantId = sub[SUB_TAG.merchantId];
      break;
    }
  }

  return {
    merchantId,
    merchantName: fields[TAG.merchantName] ?? null,
    merchantCity: fields[TAG.merchantCity] ?? null,
    guid,
    validCrc,
    fields,
  };
}
