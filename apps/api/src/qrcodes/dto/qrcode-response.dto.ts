import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { GeneratedQrCode, QrCode, QrCodeStatus } from '@qrguard/types';

export class QrCodeDto implements QrCode {
  @ApiProperty() id: string;
  @ApiProperty() shopId: string;
  @ApiProperty({ example: 'QRG482019376' }) merchantId: string;
  @ApiProperty({ description: 'EMVCo (LankaQR style) payload inside the QR image.' })
  qrPayload: string;
  @ApiProperty({ enum: ['active', 'revoked'] }) status: QrCodeStatus;
  @ApiPropertyOptional() revokedAt?: string;
  @ApiProperty() createdAt: string;
}

export class GeneratedQrCodeDto extends QrCodeDto implements GeneratedQrCode {
  @ApiProperty({ description: 'QR image as a PNG data URL, ready for <img src>.' })
  qrImage: string;
}
