import { buildMerchantQr, crc16, parseMerchantQr, QRGUARD_GUID } from './emv';

describe('EMV merchant QR', () => {
  const qr = {
    merchantId: 'QRG123456789',
    merchantName: 'Perera Grocery',
    merchantCity: 'Colombo',
  };

  it('computes the standard CRC-16/CCITT-FALSE check value', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('builds a payload that parses back to the same merchant', () => {
    const parsed = parseMerchantQr(buildMerchantQr(qr));
    expect(parsed).toMatchObject({
      merchantId: 'QRG123456789',
      merchantName: 'Perera Grocery',
      merchantCity: 'Colombo',
      guid: QRGUARD_GUID,
      validCrc: true,
    });
  });

  it('marks a changed payload as having a bad CRC', () => {
    const payload = buildMerchantQr(qr).replace('QRG123456789', 'QRG999999999');
    expect(parseMerchantQr(payload)?.validCrc).toBe(false);
  });

  it('removes characters EMVCo does not allow and cuts long names', () => {
    const parsed = parseMerchantQr(
      buildMerchantQr({ ...qr, merchantName: 'Café Ünïcode Super Long Shop Name Here' }),
    );
    expect(parsed?.merchantName).toBe('Cafe Unicode Super Long S');
    expect(parsed?.validCrc).toBe(true);
  });

  it('returns null for text that is not an EMVCo payload', () => {
    expect(parseMerchantQr('https://example.com')).toBeNull();
    expect(parseMerchantQr('0002')).toBeNull();
  });
});
