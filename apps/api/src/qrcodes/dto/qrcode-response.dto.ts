import { ApiProperty } from '@nestjs/swagger';
import type { GeneratedQrCode, QrCode, QrCodeListItem, QrCodeStatus } from '@qrguard/types';

export class QrCodeDto implements QrCode {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) shopId: string;
  @ApiProperty({ example: 'QRG482019376' }) merchantId: string;
  @ApiProperty({ description: 'EMVCo (LankaQR style) payload inside the QR image.' })
  qrPayload: string;
  @ApiProperty({ enum: ['active', 'revoked'] }) status: QrCodeStatus;
  @ApiProperty({ type: String, nullable: true }) revokedAt: string | null;
  @ApiProperty() createdAt: string;
}

export class GeneratedQrCodeDto extends QrCodeDto implements GeneratedQrCode {
  @ApiProperty({ description: 'QR image as a PNG data URL, ready for <img src>.' })
  qrImage: string;
}

export class QrCodeListItemDto extends QrCodeDto implements QrCodeListItem {
  @ApiProperty({ type: String, nullable: true, description: 'PNG data URL (active codes only).' })
  qrImage: string | null;
}
