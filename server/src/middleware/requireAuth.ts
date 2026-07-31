import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth, type Session } from '../lib/auth';

// ─── Augment Express Request ───────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: Session['user'];
      session?: Session['session'];
    }
  }
}

// ─── Options ──────────────────────────────────────────────────────────────────
interface RequireAuthOptions {
  /** If provided, the user's role must match exactly. */
  role?: 'admin' | 'agent';
}

/**
 * Middleware that validates the Better Auth session.
 *
 * Usage:
 *   router.get('/protected', requireAuth(), handler)
 *   router.get('/admin-only', requireAuth({ role: 'admin' }), handler)
 *   router.get('/agent-only', requireAuth({ role: 'agent' }), handler)
 */
export function requireAuth(options: RequireAuthOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        res.status(401).json({ error: 'Unauthorized', message: 'No valid session found.' });
        return;
      }

      // Role gate
      if (options.role) {
        const userRole = (session.user as { role?: string }).role ?? 'agent';
        if (userRole !== options.role) {
          res.status(403).json({
            error: 'Forbidden',
            message: `This endpoint requires the '${options.role}' role.`,
          });
          return;
        }
      }

      // Attach to request for downstream handlers
      req.user = session.user as Session['user'];
      req.session = session.session;

      next();
    } catch (err) {
      next(err);
    }
  };
}
