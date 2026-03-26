import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { uploadRecording, buildRecordingKey, getRecordingPlaybackUrl } from '../services/s3Service';

type TenantRequest = Request & {
  tenantUser: { id: string; tenantId: string };
};

export async function uploadRecordingHandler(req: Request, res: Response): Promise<void> {
  const tr = req as TenantRequest;
  if (!tr.tenantUser) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const file = tr.file;
  if (!file || !file.buffer) {
    res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
    return;
  }

  const {
    sessionName,
    coachId,
    durationSeconds,
    score,
    notes,
    avatarResponseScore,
    userEngagementScore,
  } = tr.body ?? {};

  const userId = tr.tenantUser.id;
  const tenantId = tr.tenantUser.tenantId;

  if (!coachId || typeof coachId !== 'string') {
    res.status(400).json({ error: 'coachId is required' });
    return;
  }

  const durSecs = parseInt(String(durationSeconds), 10);
  if (isNaN(durSecs) || durSecs < 0) {
    res.status(400).json({ error: 'durationSeconds must be a non-negative number' });
    return;
  }

  try {
    const session = await prisma.session.create({
      data: {
        userId,
        coachId: coachId.trim(),
        sessionName: typeof sessionName === 'string' ? sessionName.trim() || `Session ${new Date().toISOString().slice(0, 10)}` : `Session ${new Date().toISOString().slice(0, 10)}`,
        durationMinutes: Math.floor(durSecs / 60),
        durationSeconds: durSecs % 60,
        score: score != null ? parseInt(String(score), 10) : null,
        notes: typeof notes === 'string' ? notes.trim() || null : null,
      },
    });

    const s3Key = buildRecordingKey(tenantId, userId, coachId, session.id);
    const result = await uploadRecording(
      file.buffer as Buffer,
      s3Key,
      file.mimetype || 'video/webm'
    );

    let recordingUrl: string | null = null;
    if (result) {
      await prisma.recording.create({
        data: {
          sessionId: session.id,
          userId,
          tenantId,
          coachId: coachId.trim(),
          s3Key: result.key,
          s3Bucket: result.bucket,
          durationSeconds: durSecs,
          avatarResponseScore: avatarResponseScore != null ? parseInt(String(avatarResponseScore), 10) : null,
          userEngagementScore: userEngagementScore != null ? parseInt(String(userEngagementScore), 10) : null,
        },
      });
      recordingUrl = await getRecordingPlaybackUrl(result.bucket, result.key);
    }

    res.status(201).json({
      sessionId: session.id,
      sessionName: session.sessionName,
      durationSeconds: durSecs,
      recordingUploaded: !!result,
      recordingUrl,
    });
  } catch (err) {
    console.error('[recording] upload error:', err);
    res.status(500).json({ error: 'Failed to save recording', message: (err as Error).message });
  }
}
