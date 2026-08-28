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
};
