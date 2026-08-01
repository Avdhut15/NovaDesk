import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

// No baseURL → defaults to current origin (http://localhost:5173 in dev)
// Vite proxy forwards /api/* to http://localhost:3001
// This keeps everything same-origin so cookies work without cross-origin complexity.
export const authClient = createAuthClient({
  plugins: [adminClient()],
});

export type Session = typeof authClient.$Infer.Session;
