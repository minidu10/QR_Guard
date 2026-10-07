import { buildMerchantQr, parseMerchantQr } from '../qrcodes/emv';
import { alertTarget, decideScan, scanMessage } from './scan.logic';

const SHOP = 'shop-a';
const OTHER = 'shop-b';
const realQr = parseMerchantQr(
  buildMerchantQr({
    merchantId: 'QRG000000001',
    merchantName: 'Perera Grocery',
    merchantCity: 'Colombo',
  }),
);

describe('decideScan', () => {
  it('is safe when the QR belongs to the shop the customer is at', () => {
    expect(
      decideScan({
        parsed: realQr,
        match: { shopId: SHOP, status: 'active' },
        expectedShopIds: [SHOP],
      }),
    ).toEqual({ safe: true, reason: 'OK' });
  });

  it('is safe when we do not know where the customer is', () => {
    expect(
      decideScan({
        parsed: realQr,
        match: { shopId: SHOP, status: 'active' },
        expectedShopIds: [],
      }),
    ).toEqual({ safe: true, reason: 'OK' });
  });

  it('is safe when the QR belongs to one of the nearby shops', () => {
    const decision = decideScan({
      parsed: realQr,
      match: { shopId: SHOP, status: 'active' },
      expectedShopIds: [OTHER, SHOP],
    });
    expect(decision.safe).toBe(true);
  });

  it('warns about a QR that is not a payment QR', () => {
    expect(decideScan({ parsed: null, match: null, expectedShopIds: [SHOP] }).reason).toBe(
      'NOT_PAYMENT_QR',
    );
  });

  it('warns about a QR whose text was changed (bad checksum)', () => {
    const payload = buildMerchantQr({
      merchantId: 'QRG000000001',
      merchantName: 'Perera Grocery',
      merchantCity: 'Colombo',
    }).replace('QRG000000001', 'QRG999999999');
    const decision = decideScan({
      parsed: parseMerchantQr(payload),
      match: null,
      expectedShopIds: [SHOP],
    });
    expect(decision).toEqual({ safe: false, reason: 'BAD_CHECKSUM' });
  });

  it('warns about a merchant id that no shop has (fake sticker)', () => {
    const fake = parseMerchantQr(
      buildMerchantQr({
        merchantId: 'SCAM12345',
        merchantName: 'Perera Grocery',
        merchantCity: 'Colombo',
      }),
    );
    expect(decideScan({ parsed: fake, match: null, expectedShopIds: [SHOP] }).reason).toBe(
      'UNKNOWN_MERCHANT',
    );
  });

  it('warns about a revoked QR code', () => {
    expect(
      decideScan({
        parsed: realQr,
        match: { shopId: SHOP, status: 'revoked' },
        expectedShopIds: [SHOP],
      }).reason,
    ).toBe('REVOKED_QR');
  });

  it("warns when the QR belongs to a different shop than the customer's", () => {
    expect(
      decideScan({
        parsed: realQr,
        match: { shopId: OTHER, status: 'active' },
        expectedShopIds: [SHOP],
      }).reason,
    ).toBe('WRONG_SHOP');
  });
});

describe('alertTarget', () => {
  const warn = (reason: Parameters<typeof scanMessage>[0]) => ({ safe: false, reason });

  it('makes no alert for a safe scan', () => {
    expect(
      alertTarget({
        decision: { safe: true, reason: 'OK' },
        match: { shopId: SHOP, status: 'active' },
        expectedShopId: SHOP,
        pickedByCustomer: true,
      }),
    ).toBeNull();
  });

  it('alerts the shop with high severity when the customer picked it', () => {
    expect(
      alertTarget({
        decision: warn('UNKNOWN_MERCHANT'),
        match: null,
        expectedShopId: SHOP,
        pickedByCustomer: true,
      }),
    ).toEqual({ shopId: SHOP, severity: 'high' });
  });

  it('uses medium severity when the shop was found by location', () => {
    expect(
      alertTarget({
        decision: warn('WRONG_SHOP'),
        match: { shopId: OTHER, status: 'active' },
        expectedShopId: SHOP,
        pickedByCustomer: false,
      }),
    ).toEqual({ shopId: SHOP, severity: 'medium' });
  });

  it('alerts the owner of a revoked QR', () => {
    expect(
      alertTarget({
        decision: warn('REVOKED_QR'),
        match: { shopId: OTHER, status: 'revoked' },
        expectedShopId: null,
        pickedByCustomer: false,
      }),
    ).toEqual({ shopId: OTHER, severity: 'medium' });
  });

  it('ignores random non-payment QR scans found only by location', () => {
    expect(
      alertTarget({
        decision: warn('NOT_PAYMENT_QR'),
        match: null,
        expectedShopId: SHOP,
        pickedByCustomer: false,
      }),
    ).toBeNull();
  });

  it('makes no alert when we do not know the shop', () => {
    expect(
      alertTarget({
        decision: warn('UNKNOWN_MERCHANT'),
        match: null,
        expectedShopId: null,
        pickedByCustomer: false,
      }),
    ).toBeNull();
  });
});

describe('scanMessage', () => {
  it('names the shops in the message', () => {
    expect(scanMessage('OK', { shop: 'Perera Grocery' })).toContain('Perera Grocery');
    expect(
      scanMessage('WRONG_SHOP', { shop: 'Silva Hardware', expectedShop: 'Perera Grocery' }),
    ).toBe('This QR code belongs to Silva Hardware, not Perera Grocery. Do not pay.');
  });
});
