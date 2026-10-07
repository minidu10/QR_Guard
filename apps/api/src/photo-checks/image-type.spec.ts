import { detectImageType } from './image-type';

describe('detectImageType', () => {
  it('finds JPEG, PNG and WebP from their first bytes', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.mime).toBe('image/jpeg');
    expect(
      detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime,
    ).toBe('image/png');
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]);
    expect(detectImageType(webp)?.mime).toBe('image/webp');
  });

  it('rejects other files, even if they are named .jpg', () => {
    expect(detectImageType(Buffer.from('<html>hello</html>'))).toBeNull();
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });
});
