import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { supabaseServer, isLiveSupabase, inMemoryStore, ServerProfile } from './db';

export interface AuthenticatedRequest extends Request {
  user?: ServerProfile;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]?.trim();
  } else if (typeof req.query?.token === 'string') {
    token = req.query.token.trim();
  }

  if (!token) {
    return next();
  }

  try {
    // 1. If real Supabase is configured, verify JWT with Supabase Auth
    if (isLiveSupabase && supabaseServer && token.split('.').length === 3 && token.startsWith('eyJ')) {
      const { data: { user }, error } = await supabaseServer.auth.getUser(token);
      if (!error && user) {
        // Fetch or sync profile
        const { data: profile } = await supabaseServer
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          if (!profile.email && user.email) {
            profile.email = user.email;
          }
          req.user = profile as ServerProfile;
          return next();
        } else {
          // Sync new profile row
          const userPhone = (user.user_metadata?.phone as string) || user.phone || undefined;
          const userFullName = (user.user_metadata?.full_name as string) || '';
          // Security: Default role for any new profile is strictly CUSTOMER.
          // Client-supplied user_metadata.role is never trusted for ADMIN/STAFF escalation.
          const userRole: 'CUSTOMER' | 'STAFF' | 'ADMIN' = 'CUSTOMER';
          const nowIso = new Date().toISOString();

          const newProfilePayload: Record<string, any> = {
            id: user.id,
            email: user.email || null,
            phone: userPhone || null,
            full_name: userFullName,
            role: userRole,
            is_active: true,
            created_at: nowIso,
            updated_at: nowIso,
          };

          const { data: inserted, error: insErr } = await supabaseServer
            .from('profiles')
            .insert([newProfilePayload])
            .select('*')
            .maybeSingle();

          if (insErr) {
            console.warn('[AuthMiddleware] New profile insert warning:', insErr.message);
          }

          req.user = (inserted || newProfilePayload) as ServerProfile;
          return next();
        }
      }
    }

    // Fallback: Attempt decode JWT / session token payload if not resolved by Supabase
    if (!req.user) {
      try {
        let payloadJson: string | null = null;
        if (token.includes('.')) {
          const parts = token.split('.');
          if (parts.length >= 2) {
            payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
          }
        } else {
          payloadJson = Buffer.from(token, 'base64').toString('utf8');
        }

        if (payloadJson) {
          const decoded = JSON.parse(payloadJson);
          const userId = decoded.sub || decoded.id;

          // Check token expiration (exp is in epoch seconds per JWT standard)
          if (decoded.exp) {
            const expMs = decoded.exp > 1e11 ? decoded.exp : decoded.exp * 1000;
            if (Date.now() >= expMs) {
              // Token has expired! Do not authenticate.
              return next();
            }
          }

          if (userId) {
            let existing = inMemoryStore.profiles.get(userId);
            if (!existing) {
              existing = {
                id: userId,
                phone: decoded.phone || (decoded.user_metadata?.phone as string),
                email: decoded.email,
                full_name: decoded.user_metadata?.full_name || decoded.full_name || '',
                role: decoded.role === 'service_role' ? 'ADMIN' : 'CUSTOMER',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              inMemoryStore.profiles.set(userId, existing);
            }
            req.user = existing;
          }
        }
      } catch {
        // not a valid JWT or JSON token
      }
    }

    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    next();
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in with phone or email.',
    });
    return;
  }
  next();
}

export function requireRole(allowedRoles: Array<'CUSTOMER' | 'STAFF' | 'ADMIN'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Requires one of [${allowedRoles.join(', ')}] permissions. Current role is ${req.user.role}.`,
      });
      return;
    }

    next();
  };
}
