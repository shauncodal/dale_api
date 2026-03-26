import MailerLite from '@mailerlite/mailerlite-nodejs';
import { config } from '../lib/config';

/**
 * Sync a user as a MailerLite subscriber (e.g. after invite).
 * Uses the official MailerLite Node.js SDK.
 * No-ops if MAILERLITE_API_TOKEN is not set. Logs errors without throwing.
 */
export async function syncSubscriber(email: string, name: string): Promise<{ synced: boolean; error?: string }> {
  if (!config.mailerliteApiToken) return { synced: false };

  try {
    const mailerlite = new MailerLite({
      api_key: config.mailerliteApiToken,
    });
    await mailerlite.subscribers.createOrUpdate({
      email,
      fields: { name: name || '', last_name: '' },
    });
    return { synced: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[mailerlite] Sync error:', message);
    return { synced: false, error: message };
  }
}
