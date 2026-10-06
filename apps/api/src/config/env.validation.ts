import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  validateSync,
} from 'class-validator';

// All environment variables the API needs. The app will not start if one is wrong.
class EnvVars {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 4000;

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsString()
  MONGODB_URI: string;

  @IsString()
  REDIS_URL: string;

  // Empty means "use AWS S3 default endpoint".
  @IsOptional()
  @IsUrl({ require_tld: false })
  S3_ENDPOINT?: string;

  @IsString()
  S3_REGION: string = 'us-east-1';

  @IsString()
  S3_ACCESS_KEY: string;

  @IsString()
  S3_SECRET_KEY: string;

  @IsString()
  S3_BUCKET: string;

  @IsBooleanString()
  S3_FORCE_PATH_STYLE: string = 'false';

  @IsUrl({ require_tld: false })
  AI_SERVICE_URL: string;
}

export type Env = EnvVars;

export function validateEnv(raw: Record<string, unknown>): EnvVars {
  const env = plainToInstance(EnvVars, raw, { enableImplicitConversion: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    const list = errors.map(
      (e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
    );
    throw new Error(`Invalid environment variables:\n${list.join('\n')}`);
  }
  return env;
}
