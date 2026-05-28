const required = ['MONGODB_URI'] as const;
const optional = [
  'PORT',
  'LOG_LEVEL',
  'TCGPLAYER_API_KEY',
  'TCGPLAYER_BASE_URL',
  'MANAPOOL_AUTH_TOKEN',
  'MANAPOOL_BASE_URL',
  'TOA_MAGIC_API_KEY',
  'TOA_MAGIC_BASE_URL',
  'REDIS_URL',
  'SCHEDULE_INGEST',
  'SCRYFALL_RATE_LIMIT_MS',
  'SENDGRID_API_KEY',
  'ALERT_FROM_EMAIL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

export function validateEnv(): void {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[env] FATAL: missing required environment variables: ${missing.join(', ')}`);
    console.error('[env] Copy configs/.env.example to configs/.env and fill in the values.');
    process.exit(1);
  }

  const missingOptional = optional.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(`[env] Optional variables not set (features may be disabled): ${missingOptional.join(', ')}`);
  }
}
