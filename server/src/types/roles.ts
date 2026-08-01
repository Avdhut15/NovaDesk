// ─── Role ─────────────────────────────────────────────────────────────────────
// Single source of truth for role strings used by Better Auth's admin plugin.
// Import this wherever role values are needed (auth config, seed, middleware).

export enum Role {
  ADMIN = 'admin',
  AGENT = 'agent',
}
