import { cityFromAddress, newMerchantId } from './qrcodes.service';

describe('QR code helpers', () => {
  it('makes merchant ids like QRG + 9 digits', () => {
    for (let i = 0; i < 50; i++) expect(newMerchantId()).toMatch(/^QRG\d{9}$/);
  });

  it('takes the city from the end of the address', () => {
    expect(cityFromAddress('45 Galle Road, Colombo 03')).toBe('Colombo');
    expect(cityFromAddress('12 Dalada Veediya, Kandy')).toBe('Kandy');
    expect(cityFromAddress('Somewhere')).toBe('Somewhere');
    expect(cityFromAddress('')).toBe('Sri Lanka');
  });
});
