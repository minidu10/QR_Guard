import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';
import { Env } from '../config/env.validation';

// File storage: MinIO locally, AWS S3 in production. Same API for both.
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.s3 = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }) || undefined,
      region: config.get('S3_REGION', { infer: true }),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }) === 'true',
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<{ body: Readable; contentType: string }> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return {
        body: res.Body as Readable,
        contentType: res.ContentType ?? 'application/octet-stream',
      };
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey')
        throw new NotFoundException('File not found');
      throw err;
    }
  }

  /** Throws if the bucket cannot be reached (used by the health check). */
  async ping() {
    await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  onModuleDestroy() {
    this.s3.destroy();
  }
}
