import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

type TenantRequest = Request & { tenantUser?: { id: string; tenantId: string } };
type AdminRequest = Request & { auth?: { sub: string; tenantId?: string | null } };

export interface ReportSummary {
  sessionCount: number;
  totalDurationSeconds: number;
  avgScore: number | null;
  avgAvatarResponseScore: number | null;
  avgUserEngagementScore: number | null;
  sessions: Array<{
    id: string;
    sessionName: string;
    coachId: string;
    durationSeconds: number;
    score: number | null;
    avatarResponseScore: number | null;
    userEngagementScore: number | null;
    notes: string | null;
    createdAt: string;
  }>;
}

/** GET /api/report - User's own report (tenant auth) */
export async function getMyReport(req: TenantRequest, res: Response): Promise<void> {
  const userId = req.tenantUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const report = await buildReport({ userId });
  res.json(report);
}

/** GET /api/tenants/:tenantId/report - Tenant admin report */
export async function getTenantReport(req: AdminRequest, res: Response): Promise<void> {
  const tenantId = req.params.tenantId;
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (auth.tenantId && auth.tenantId !== tenantId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const report = await buildReport({ tenantId });
  res.json(report);
}

/** GET /api/report/platform - Super admin platform report */
export async function getPlatformReport(req: AdminRequest, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.tenantId) {
    res.status(403).json({ error: 'Forbidden: super admin only' });
    return;
  }
  const report = await buildReport({});
  res.json(report);
}

async function buildReport(
  filter: { userId?: string; tenantId?: string }
): Promise<ReportSummary> {
  const where: { userId?: string; deletedAt: null; user?: { tenantId: string } } = {
    deletedAt: null,
  };
  if (filter.userId) where.userId = filter.userId;
  if (filter.tenantId) where.user = { tenantId: filter.tenantId };

  const sessions = await prisma.session.findMany({
    where,
    include: { recording: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const totalDuration = sessions.reduce(
    (sum, s) => sum + (s.durationSeconds ?? s.durationMinutes * 60),
    0
  );
  const scores = sessions.map((s) => s.score).filter((s): s is number => s != null);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const avatarScores = sessions
    .map((s) => s.recording?.avatarResponseScore)
    .filter((s): s is number => s != null);
  const engagementScores = sessions
    .map((s) => s.recording?.userEngagementScore)
    .filter((s): s is number => s != null);
  const avgAvatar =
    avatarScores.length ? avatarScores.reduce((a, b) => a + b, 0) / avatarScores.length : null;
  const avgEngagement =
    engagementScores.length
      ? engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length
      : null;

  return {
    sessionCount: sessions.length,
    totalDurationSeconds: totalDuration,
    avgScore: avgScore != null ? Math.round(avgScore) : null,
    avgAvatarResponseScore: avgAvatar != null ? Math.round(avgAvatar) : null,
    avgUserEngagementScore: avgEngagement != null ? Math.round(avgEngagement) : null,
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionName: s.sessionName,
      coachId: s.coachId,
      durationSeconds: s.durationSeconds ?? s.durationMinutes * 60,
      score: s.score,
      avatarResponseScore: s.recording?.avatarResponseScore ?? null,
      userEngagementScore: s.recording?.userEngagementScore ?? null,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}
