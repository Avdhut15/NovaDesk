const required = (key: string): string => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
};

export const env = {
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as
    | 'development'
    | 'production'
    | 'test',
  PORT: Number(process.env.PORT ?? 3001),
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  DATABASE_URL: required('DATABASE_URL'),
  BETTER_AUTH_SECRET: required('BETTER_AUTH_SECRET'),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  GEMINI_API_KEY: required('GEMINI_API_KEY'),

  // ─── Email (IMAP + SMTP) ────────────────────────────────────────────────────
  // All optional — if absent, the email subsystem disables itself gracefully.
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD,
  // IMAP (inbound)
  EMAIL_HOST: process.env.EMAIL_HOST ?? 'imap.gmail.com',
  EMAIL_PORT: Number(process.env.EMAIL_PORT ?? 993),
  // SMTP (outbound)
  EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST ?? 'smtp.gmail.com',
  EMAIL_SMTP_PORT: Number(process.env.EMAIL_SMTP_PORT ?? 587),
  // How often to poll the inbox, in seconds (default: 60)
  EMAIL_POLL_INTERVAL: Number(process.env.EMAIL_POLL_INTERVAL ?? 60),
};
