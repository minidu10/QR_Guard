import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PhotoResult } from '@qrguard/types';
import { Env } from '../config/env.validation';

export interface AiPrediction {
  label: PhotoResult;
  confidence: number;
  mode: 'mock' | 'real';
}

const TIMEOUT_MS = 15_000;

// Talks to the Python AI service.
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly url: string;

  constructor(config: ConfigService<Env, true>) {
    this.url = config.get('AI_SERVICE_URL', { infer: true });
  }

  /** Asks the AI service if the QR sticker in this photo looks real or tampered. */
  async predictTamper(image: Buffer, filename: string, contentType: string): Promise<AiPrediction> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(image)], { type: contentType }), filename);

    let res: Response;
    try {
      res = await fetch(`${this.url}/predict`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.warn(`AI service unreachable: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'The AI check is not available right now. Try again soon.',
      );
    }

    // The AI service could not read the photo (too big, not an image...).
    if (res.status === 413 || res.status === 415 || res.status === 422) {
      const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
      throw new UnprocessableEntityException(
        typeof body?.detail === 'string' ? body.detail : 'This photo cannot be checked.',
      );
    }
    if (!res.ok) {
      this.logger.warn(`AI service answered ${res.status}`);
      throw new ServiceUnavailableException(
        'The AI check is not available right now. Try again soon.',
      );
    }
    return (await res.json()) as AiPrediction;
  }
}
