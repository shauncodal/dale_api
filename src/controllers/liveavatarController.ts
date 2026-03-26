import { Request, Response } from 'express';
import { config } from '../lib/config';

const LIVEAVATAR_BASE = 'https://api.liveavatar.com/v1';

/** LiveAvatar API uses X-API-KEY header per docs.liveavatar.com (avatars, contexts, sessions/token) */
function getLiveAvatarHeaders(contentType = false): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const apiKey = config.liveavatarApiKey?.trim();
  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

/** Session token endpoint uses X-API-KEY (same as other LiveAvatar endpoints) */
function getSessionTokenHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const apiKey = config.liveavatarApiKey?.trim();
  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }
  return headers;
}

export async function proxyGetAvatarsPublic(_req: Request, res: Response): Promise<void> {
  try {
    const resp = await fetch(`${LIVEAVATAR_BASE}/avatars/public`, {
      method: 'GET',
      headers: getLiveAvatarHeaders(),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[liveavatar] proxyGetAvatarsPublic error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}

export async function proxyGetContexts(_req: Request, res: Response): Promise<void> {
  try {
    const resp = await fetch(`${LIVEAVATAR_BASE}/contexts`, {
      method: 'GET',
      headers: getLiveAvatarHeaders(),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[liveavatar] proxyGetContexts error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}

export async function proxyPostContexts(req: Request, res: Response): Promise<void> {
  try {
    const body = JSON.stringify(req.body ?? {});
    const resp = await fetch(`${LIVEAVATAR_BASE}/contexts`, {
      method: 'POST',
      headers: getLiveAvatarHeaders(true),
      body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[liveavatar] proxyPostContexts error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}

export async function proxyGetContextById(req: Request, res: Response): Promise<void> {
  try {
    const contextId = req.params.contextId?.trim();
    if (!contextId) {
      res.status(400).json({ error: 'contextId is required' });
      return;
    }
    const path = `${LIVEAVATAR_BASE}/contexts/${encodeURIComponent(contextId)}`;
    const resp = await fetch(path, {
      method: 'GET',
      headers: getLiveAvatarHeaders(),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[liveavatar] proxyGetContextById error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}

export async function proxyPatchContext(req: Request, res: Response): Promise<void> {
  try {
    const contextId = req.params.contextId?.trim();
    if (!contextId) {
      res.status(400).json({ error: 'contextId is required' });
      return;
    }
    const body = JSON.stringify(req.body ?? {});
    const path = `${LIVEAVATAR_BASE}/contexts/${encodeURIComponent(contextId)}`;
    const resp = await fetch(path, {
      method: 'PATCH',
      headers: getLiveAvatarHeaders(true),
      body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[liveavatar] proxyPatchContext error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}

export async function proxyPostSessionToken(req: Request, res: Response): Promise<void> {
  try {
    const { avatar_id, context_id, voice_id, is_sandbox } = req.body ?? {};
    if (!avatar_id || typeof avatar_id !== 'string') {
      res.status(400).json({ error: 'avatar_id is required' });
      return;
    }
    const avatarPersona: { language: string; context_id?: string; voice_id?: string } = { language: 'en' };
    if (context_id && typeof context_id === 'string') avatarPersona.context_id = context_id;
    if (voice_id && typeof voice_id === 'string') avatarPersona.voice_id = voice_id;
    const payload = {
      avatar_id,
      mode: 'FULL',
      is_sandbox: Boolean(is_sandbox),
      interactivity_type: 'CONVERSATIONAL',
      avatar_persona: avatarPersona,
    };
    const resp = await fetch(`${LIVEAVATAR_BASE}/sessions/token`, {
      method: 'POST',
      headers: getSessionTokenHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[liveavatar] proxyPostSessionToken error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}

export async function proxyPostSessionStart(req: Request, res: Response): Promise<void> {
  try {
    let sessionToken = req.body?.session_token as string | undefined;
    if (!sessionToken && req.headers.authorization?.startsWith('Bearer ')) {
      sessionToken = req.headers.authorization.slice(7);
    }
    if (!sessionToken || typeof sessionToken !== 'string') {
      res.status(400).json({ error: 'session_token is required in body or Authorization Bearer header' });
      return;
    }
    const resp = await fetch(`${LIVEAVATAR_BASE}/sessions/start`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('[liveavatar] proxyPostSessionStart error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}

export async function proxyPostSessionStop(req: Request, res: Response): Promise<void> {
  try {
    let sessionToken = req.body?.session_token as string | undefined;
    if (!sessionToken && req.headers.authorization?.startsWith('Bearer ')) {
      sessionToken = req.headers.authorization.slice(7);
    }
    if (!sessionToken || typeof sessionToken !== 'string') {
      res.status(400).json({ error: 'session_token is required in body or Authorization Bearer header' });
      return;
    }
    const resp = await fetch(`${LIVEAVATAR_BASE}/sessions/stop`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(req.body ?? {}),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[liveavatar] proxyPostSessionStop error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}

export async function proxyPostSessionKeepAlive(req: Request, res: Response): Promise<void> {
  try {
    let sessionToken = req.body?.session_token as string | undefined;
    if (!sessionToken && req.headers.authorization?.startsWith('Bearer ')) {
      sessionToken = req.headers.authorization.slice(7);
    }
    if (!sessionToken || typeof sessionToken !== 'string') {
      res.status(400).json({ error: 'session_token is required in body or Authorization Bearer header' });
      return;
    }
    const resp = await fetch(`${LIVEAVATAR_BASE}/sessions/keep-alive`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(req.body ?? {}),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json(data);
      return;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error('[liveavatar] proxyPostSessionKeepAlive error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}

export async function getPreviewUrl(req: Request, res: Response): Promise<void> {
  try {
    const avatarId = (req.query.avatarId as string)?.trim();
    if (!avatarId) {
      res.status(400).json({ error: 'avatarId query param is required' });
      return;
    }
    const contextId = (req.query.contextId as string)?.trim() || undefined;
    const voiceId = (req.query.voiceId as string)?.trim() || undefined;
    const isSandbox = req.query.isSandbox === 'true' || req.query.isSandbox === '1';

    const avatarPersona: { language: string; context_id?: string; voice_id?: string } = { language: 'en' };
    if (contextId) avatarPersona.context_id = contextId;
    if (voiceId) avatarPersona.voice_id = voiceId;

    const tokenResp = await fetch(`${LIVEAVATAR_BASE}/sessions/token`, {
      method: 'POST',
      headers: getSessionTokenHeaders(),
      body: JSON.stringify({
        avatar_id: avatarId,
        mode: 'FULL',
        is_sandbox: isSandbox,
        interactivity_type: 'CONVERSATIONAL',
        avatar_persona: avatarPersona,
      }),
    });
    const tokenData = (await tokenResp.json()) as { code?: number; data?: { session_token?: string }; message?: string };
    if (!tokenResp.ok) {
      res.status(tokenResp.status).json(tokenData);
      return;
    }
    const sessionToken = tokenData?.data?.session_token;
    if (!sessionToken) {
      res.status(500).json({ error: 'LiveAvatar token response missing session_token' });
      return;
    }

    const startResp = await fetch(`${LIVEAVATAR_BASE}/sessions/start`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
    });
    const startData = (await startResp.json()) as {
      code?: number;
      data?: { livekit_url?: string; livekit_client_token?: string };
      message?: string;
    };
    if (!startResp.ok) {
      res.status(startResp.status).json(startData);
      return;
    }
    const livekitUrl = startData?.data?.livekit_url;
    const livekitClientToken = startData?.data?.livekit_client_token;
    if (!livekitUrl || !livekitClientToken) {
      res.status(500).json({ error: 'LiveAvatar start response missing livekit_url or livekit_client_token' });
      return;
    }
    const meetUrl = `https://meet.livekit.io/custom?liveKitUrl=${encodeURIComponent(livekitUrl)}&token=${encodeURIComponent(livekitClientToken)}`;
    res.status(200).json({ meetUrl });
  } catch (err) {
    console.error('[liveavatar] getPreviewUrl error:', err);
    res.status(500).json({ error: 'LiveAvatar proxy error', message: (err as Error).message });
  }
}
