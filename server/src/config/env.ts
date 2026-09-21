import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from server/.env and root .env
dotenv.config({ path: path.join(process.cwd(), 'server/.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  GROQ_API_KEY: z.string().optional().default(''),
  MAX_FILE_SIZE_MB: z.coerce.number().default(15),
  RATE_LIMIT_RPM: z.coerce.number().default(200),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!_config) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const errors = parsed.error.issues
        .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      console.warn(`⚠️ Environment validation warnings:\n${errors}`);
      _config = {
        NODE_ENV: (process.env.NODE_ENV as any) || 'development',
        PORT: Number(process.env.PORT) || 3001,
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
        MAX_FILE_SIZE_MB: 15,
        RATE_LIMIT_RPM: 200,
      };
    } else {
      _config = parsed.data;
    }
  }
  return _config;
}

export function resetConfig(): void {
  _config = null;
}
