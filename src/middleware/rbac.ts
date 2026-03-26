import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';

export interface AdminAuthPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  tenantId?: string;
  mustChangePassword: boolean;
  aud: string;
}

/** Exported for controllers that need the same rule as route middleware. */
export function adminHasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes(required)) return true;
  const [resource] = required.split(':');
  const wildcard = `${resource}:*`;
  if (permissions.includes(wildcard)) return true;
  return false;
}

/**
 * Middleware that validates JWT and requires aud === 'admin'.
 * Sets req.auth with full admin payload (sub, email, role, permissions, tenantId, mustChangePassword).
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AdminAuthPayload;
    if (decoded.aud !== 'admin') {
      res.status(403).json({ error: 'Forbidden', code: 'NOT_ADMIN_TOKEN' });
      return;
    }
    (req as Request & { auth: AdminAuthPayload }).auth = {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role ?? 'super_admin',
      permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],
      tenantId: decoded.tenantId,
      mustChangePassword: decoded.mustChangePassword ?? false,
      aud: decoded.aud,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}

/**
 * Factory: returns middleware that requires the given permission.
 * Must be used after requireAdminAuth.
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = (req as Request & { auth: AdminAuthPayload }).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (adminHasPermission(auth.permissions, permission)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSION' });
  };
}

/**
 * Middleware that ensures tenant-scoped admins can only access their own tenant.
 * Must be used after requireAdminAuth.
 * @param tenantIdParam - The route param name for tenant ID (e.g. 'id' for /tenants/:id)
 */
export function requireTenantScope(tenantIdParam: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = (req as Request & { auth: AdminAuthPayload }).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!auth.tenantId) {
      next();
      return;
    }
    const requestedTenantId = req.params[tenantIdParam];
    if (!requestedTenantId || requestedTenantId !== auth.tenantId) {
      res.status(403).json({ error: 'Forbidden', code: 'TENANT_SCOPE_VIOLATION' });
      return;
    }
    next();
  };
}
