import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
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

  // PostgreSQL connection string (local Docker or Supabase).
  @IsString()
  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL must start with postgresql://' })
  DATABASE_URL: string;

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

  // Long random strings. Access and refresh secrets must be different.
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsInt()
  @Min(60)
  JWT_ACCESS_TTL_SECONDS: number = 900; // 15 minutes

  @IsInt()
  @Min(60)
  JWT_REFRESH_TTL_SECONDS: number = 604800; // 7 days

  // Payment drop check: alert when the last hour < DROP_RATIO x normal,
  // and normal is at least DROP_MIN_NORMAL payments. Normal = same hour over DROP_LOOKBACK_DAYS days.
  // How often it runs is DROP_CHECK_CRON (cron syntax, default every 15 minutes).
  @IsNumber()
  @Min(0.05)
  @Max(1)
  DROP_RATIO: number = 0.4;

  @IsInt()
  @Min(1)
  DROP_MIN_NORMAL: number = 5;

  @IsInt()
  @Min(1)
  @Max(28)
  DROP_LOOKBACK_DAYS: number = 7;

  @IsOptional()
  @IsString()
  DROP_CHECK_CRON?: string;

  // Demo only: keep fake payments coming in live. Never on with real data.
  @IsBooleanString()
  PAYMENT_SIMULATOR: string = 'false';
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
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }
  return env;
}
