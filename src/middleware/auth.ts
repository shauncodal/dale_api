import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config';
import { prisma } from '../lib/prisma';

export interface AuthPayload {
  sub: string;
  email: string;
}

export interface TenantUserPayload {
  sub: string;
  tenantId: string;
  groupId?: string;
  email: string;
  mustChangePassword: boolean;
  aud: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload;
    (req as Request & { auth: AuthPayload }).auth = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}

export async function tenantAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TenantUserPayload;
    if (decoded.aud !== 'tenant') {
      res.status(403).json({ error: 'Forbidden', code: 'NOT_TENANT_TOKEN' });
      return;
    }
    let groupId = decoded.groupId;
    if (!groupId) {
      const user = await prisma.user.findUnique({ where: { id: decoded.sub }, select: { groupId: true } });
      if (!user?.groupId) {
        res.status(403).json({ error: 'Re-login required', code: 'GROUP_REQUIRED' });
        return;
      }
      groupId = user.groupId;
    }
    (req as Request & { tenantUser: { id: string; tenantId: string; groupId: string; email: string; mustChangePassword: boolean } }).tenantUser = {
      id: decoded.sub,
      tenantId: decoded.tenantId,
      groupId,
      email: decoded.email,
      mustChangePassword: decoded.mustChangePassword,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}
