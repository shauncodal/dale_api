import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getRecordingPlaybackUrl } from '../services/s3Service';

type TenantRequest = Request & {
  tenantUser?: { id: string; tenantId: string };
};
type AdminRequest = Request & {
  auth?: { sub: string; tenantId?: string | null };
};

/** GET /api/recordings/sessions - Tenant user's own sessions */
export async function getMySessions(req: TenantRequest, res: Response): Promise<void> {
  const tu = req.tenantUser;
  if (!tu) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = tu.id;
  const sessions = await prisma.session.findMany({
    where: { userId, deletedAt: null },
    include: { recording: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const withUrls = await addPresignedUrls(sessions);
  res.status(200).json(withUrls);
}

/** GET /api/users/:userId/sessions - User's own past sessions (or tenant admin viewing user) */
export async function getUserSessions(req: TenantRequest | AdminRequest, res: Response): Promise<void> {
  const requestedUserId = req.params.userId ?? req.params.id;
  const tenantUser = (req as TenantRequest).tenantUser;
  const adminAuth = (req as AdminRequest).auth;

  // Tenant user: can only access own sessions
  if (tenantUser) {
    if (requestedUserId !== tenantUser.id) {
      res.status(403).json({ error: 'Forbidden: can only access own sessions' });
      return;
    }
    const sessions = await prisma.session.findMany({
      where: { userId: tenantUser.id, deletedAt: null },
      include: { recording: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const withUrls = await addPresignedUrls(sessions);
    res.status(200).json(withUrls);
    return;
  }

  // Admin: tenant admin can access users in their tenant; super admin can access all
  if (adminAuth) {
    const where: { userId: string; deletedAt: null; user?: { tenantId: string } } = {
      userId: requestedUserId,
      deletedAt: null,
    };
    if (adminAuth.tenantId) {
      where.user = { tenantId: adminAuth.tenantId };
    }
    const sessions = await prisma.session.findMany({
      where,
      include: { recording: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const withUrls = await addPresignedUrls(sessions);
    res.status(200).json(withUrls);
    return;
  }

  res.status(401).json({ error: 'Unauthorized' });
}

async function addPresignedUrls(sessions: Array<{
  recording?: { s3Bucket: string; s3Key: string } | null;
  [k: string]: unknown;
}>): Promise<unknown[]> {
  const result = [];
  for (const s of sessions) {
    const rec = s.recording;
    let recordingUrl: string | null = null;
    if (rec) {
      recordingUrl = await getRecordingPlaybackUrl(rec.s3Bucket, rec.s3Key);
    }
    result.push({ ...s, recordingUrl });
  }
  return result;
}
