import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin as adminPlugin } from 'better-auth/plugins';
import { prisma } from './prisma';
import { env } from '../config/env';
import { Role } from '../types/roles';

// ─── Role definitions ─────────────────────────────────────────────────────────
// We use "admin" and "agent" as our Better Auth role strings,
// which map to the ADMIN / AGENT roles in the app.

export const auth = betterAuth({
  // ─── Core ───────────────────────────────────────────────────────────────────
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  // ─── Database ───────────────────────────────────────────────────────────────
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // ─── Email / Password ───────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },

  // ─── Session ────────────────────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes client-side cache
    },
  },

  // ─── Plugins ────────────────────────────────────────────────────────────────
  plugins: [
    adminPlugin({
      defaultRole: Role.AGENT,
      adminRole: Role.ADMIN,
    }),
  ],

  // ─── Trusted origins ────────────────────────────────────────────────────────
  trustedOrigins: [
    env.CLIENT_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
