import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { config } from '../lib/config';

// --- DALE email design tokens (from globals.css) - black theme ---
const EMAIL = {
  bg: '#000000',
  card: '#0a0e14',
  border: '#1e3a2e',
  primary: '#a3e635',
  secondary: '#10b981',
  foreground: '#e2e4ea',
  muted: '#9ca3af',
  mutedDark: '#6b7280',
  inputBg: '#1f2937',
} as const;

function buildInviteHtml(params: {
  name: string;
  tempPassword: string;
  loginUrl: string;
  isAdmin?: boolean;
}): string {
  const { name, tempPassword, loginUrl, isAdmin } = params;
  const n = escapeHtml(name);
  const pw = escapeHtml(tempPassword);
  const url = escapeHtml(loginUrl);
  const title = isAdmin ? 'DALE Admin' : 'DALE';
  const subtitle = isAdmin ? 'Admin platform' : 'Digital Adaptive Learning Ecosystem';
  const ctaText = isAdmin ? 'Sign in to Admin' : 'Sign in now';
  const logoHtml = config.logoUrl
    ? `<img src="${escapeHtml(config.logoUrl)}" alt="${escapeHtml(title)}" width="160" height="auto" style="display:block;max-width:160px;height:auto;margin:0 auto;" />`
    : `<h1 style="margin:0;font-size:24px;font-weight:700;color:${EMAIL.primary};text-transform:uppercase;letter-spacing:0.1em;">${title}</h1>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:${EMAIL.bg};">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${EMAIL.bg};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:${EMAIL.card};border:1px solid ${EMAIL.border};border-radius:0;">
<tr><td style="padding:32px 32px 24px;border-bottom:1px solid ${EMAIL.border};text-align:center;">
${logoHtml}
<p style="margin:12px 0 0;font-size:12px;color:${EMAIL.muted};letter-spacing:0.05em;">${subtitle}</p>
</td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${EMAIL.foreground};">Hi ${n},</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${EMAIL.foreground};">You've been invited to join ${title}. Use the details below to sign in:</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${EMAIL.inputBg};border:1px solid ${EMAIL.border};margin-bottom:24px;">
<tr><td style="padding:20px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${EMAIL.muted};text-transform:uppercase;letter-spacing:0.1em;">Temporary password</p>
<p style="margin:0;font-size:16px;font-family:monospace;color:${EMAIL.primary};font-weight:600;">${pw}</p>
</td></tr>
<tr><td style="padding:0 20px 20px;">
<p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${EMAIL.muted};text-transform:uppercase;letter-spacing:0.1em;">Login URL</p>
<a href="${url}" style="color:${EMAIL.secondary};text-decoration:none;font-size:14px;word-break:break-all;">${url}</a>
</td></tr>
</table>
<a href="${url}" style="display:inline-block;padding:14px 28px;background-color:${EMAIL.primary};color:#0a0e14;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;">${ctaText}</a>
<p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:${EMAIL.muted};">You must change your password on first login for security.</p>
<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:${EMAIL.muted};">If you didn't expect this email, you can ignore it.</p>
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid ${EMAIL.border};">
<p style="margin:0;font-size:12px;color:${EMAIL.mutedDark};">DALE — Digital Adaptive Learning Ecosystem</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildPasswordResetHtml(resetUrl: string): string {
  const url = escapeHtml(resetUrl);
  const logoHtml = config.logoUrl
    ? `<img src="${escapeHtml(config.logoUrl)}" alt="DALE" width="160" height="auto" style="display:block;max-width:160px;height:auto;margin:0 auto;" />`
    : `<h1 style="margin:0;font-size:24px;font-weight:700;color:${EMAIL.primary};text-transform:uppercase;letter-spacing:0.1em;">DALE</h1>`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:${EMAIL.bg};">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${EMAIL.bg};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:${EMAIL.card};border:1px solid ${EMAIL.border};border-radius:0;">
<tr><td style="padding:32px 32px 24px;border-bottom:1px solid ${EMAIL.border};text-align:center;">
${logoHtml}
<p style="margin:12px 0 0;font-size:12px;color:${EMAIL.muted};letter-spacing:0.05em;">Digital Adaptive Learning Ecosystem</p>
</td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${EMAIL.foreground};">Hi,</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${EMAIL.foreground};">You requested a password reset for your DALE account. Use the link below to reset your password:</p>
<a href="${url}" style="display:inline-block;padding:14px 28px;background-color:${EMAIL.primary};color:#0a0e14;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;text-decoration:none;">Reset password</a>
<p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:${EMAIL.muted};">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid ${EMAIL.border};">
<p style="margin:0;font-size:12px;color:${EMAIL.mutedDark};">DALE — Digital Adaptive Learning Ecosystem</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Send invite email with temporary password and login URL via MailerSend.
 * No-ops (and logs in development) if MailerSend API key or sender is not configured.
 */
const EMAIL_TYPE = { user_invite: 'user_invite', admin_invite: 'admin_invite', tenant_invite: 'tenant_invite', password_reset: 'password_reset' } as const;

export async function sendInviteEmail(
  to: string,
  name: string,
  tempPassword: string,
  loginUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const type = EMAIL_TYPE.user_invite;
  const configured = !!(config.mailerSendApiKey && config.mailFrom);
  console.log('[email] Invite attempt:', { to, name, type, mailerSendConfigured: configured });

  const subject = "You're invited to DALE";
  const textBody = `Hi ${name},

You've been invited to join DALE (Digital Adaptive Learning Ecosystem). Use the details below to sign in:

Temporary password: ${tempPassword}
Login URL: ${loginUrl}

You must change your password on first login for security.

If you didn't expect this email, you can ignore it.`;

  const htmlBody = buildInviteHtml({ name, tempPassword, loginUrl });

  if (!configured) {
    const reason = !config.mailerSendApiKey ? 'MAILERSEND_API_KEY missing' : 'MAIL_FROM missing';
    if (config.nodeEnv === 'development') {
      console.log('[email] Skipped (not configured):', { to, type, reason }, '- Dev mode: logging invite (use this to sign in):', {
        to,
        name,
        loginUrl,
        tempPassword,
        from: config.mailFrom || 'invite@digitalflux.co.za',
      });
      return { sent: true };
    }
    console.warn('[email] Skipped (not configured):', { to, type, reason });
    return { sent: false, error: 'Email not configured' };
  }

  try {
    const mailerSend = new MailerSend({
      apiKey: config.mailerSendApiKey,
    });
    const sentFrom = new Sender(config.mailFrom, config.mailFromName || config.mailFrom);
    const recipients = [new Recipient(to, name)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(sentFrom)
      .setSubject(subject)
      .setText(textBody)
      .setHtml(htmlBody);

    await mailerSend.email.send(emailParams);
    console.log('[email] Invite sent:', { to, type });
    return { sent: true };
  } catch (err) {
    const message = formatMailerSendError(err);
    console.error('[email] Invite failed:', { to, type, error: message });
    return { sent: false, error: message };
  }
}

/**
 * Send admin invite email with temporary password and admin login URL.
 * Used when creating a tenant (contact gets admin access) or when adding admin users.
 */
export async function sendAdminInviteEmail(
  to: string,
  name: string,
  tempPassword: string,
  adminLoginUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const type = EMAIL_TYPE.admin_invite;
  const configured = !!(config.mailerSendApiKey && config.mailFrom);
  console.log('[email] Invite attempt:', { to, name, type, mailerSendConfigured: configured });

  const subject = "You're invited to DALE Admin";
  const textBody = `Hi ${name},

You've been invited to the DALE Admin platform. Use the details below to sign in:

Temporary password: ${tempPassword}
Admin login URL: ${adminLoginUrl}

You must change your password on first login for security.

If you didn't expect this email, you can ignore it.`;

  const htmlBody = buildInviteHtml({
    name,
    tempPassword,
    loginUrl: adminLoginUrl,
    isAdmin: true,
  });

  if (!configured) {
    const reason = !config.mailerSendApiKey ? 'MAILERSEND_API_KEY missing' : 'MAIL_FROM missing';
    if (config.nodeEnv === 'development') {
      console.log('[email] Skipped (not configured):', { to, type, reason }, '- Dev mode: logging admin invite:', {
        to,
        name,
        adminLoginUrl,
        tempPassword,
        from: config.mailFrom || 'invite@digitalflux.co.za',
      });
      return { sent: true };
    }
    console.warn('[email] Skipped (not configured):', { to, type, reason });
    return { sent: false, error: 'Email not configured' };
  }

  try {
    const mailerSend = new MailerSend({
      apiKey: config.mailerSendApiKey,
    });
    const sentFrom = new Sender(config.mailFrom, config.mailFromName || config.mailFrom);
    const recipients = [new Recipient(to, name)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(sentFrom)
      .setSubject(subject)
      .setText(textBody)
      .setHtml(htmlBody);

    await mailerSend.email.send(emailParams);
    console.log('[email] Invite sent:', { to, type });
    return { sent: true };
  } catch (err) {
    const message = formatMailerSendError(err);
    console.error('[email] Invite failed:', { to, type, error: message });
    return { sent: false, error: message };
  }
}

/**
 * Send password reset email with reset URL via MailerSend.
 * For use when implementing forgot-password flow. No-ops if MailerSend not configured.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const type = EMAIL_TYPE.password_reset;
  const configured = !!(config.mailerSendApiKey && config.mailFrom);
  console.log('[email] Invite attempt:', { to, type, mailerSendConfigured: configured });

  const subject = 'Reset your DALE password';
  const textBody = `Hi,

You requested a password reset for your DALE account. Use the link below to reset your password:

Reset link: ${resetUrl}

This link expires in 1 hour. If you didn't request this, you can ignore this email.`;

  const htmlBody = buildPasswordResetHtml(resetUrl);

  if (!configured) {
    const reason = !config.mailerSendApiKey ? 'MAILERSEND_API_KEY missing' : 'MAIL_FROM missing';
    if (config.nodeEnv === 'development') {
      console.log('[email] Skipped (not configured):', { to, type, reason }, '- Dev mode: logging password reset:', {
        to,
        resetUrl,
        from: config.mailFrom || 'invite@digitalflux.co.za',
      });
      return { sent: true };
    }
    console.warn('[email] Skipped (not configured):', { to, type, reason });
    return { sent: false, error: 'Email not configured' };
  }

  try {
    const mailerSend = new MailerSend({
      apiKey: config.mailerSendApiKey,
    });
    const sentFrom = new Sender(config.mailFrom, config.mailFromName || config.mailFrom);
    const recipients = [new Recipient(to, to)];
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(sentFrom)
      .setSubject(subject)
      .setText(textBody)
      .setHtml(htmlBody);

    await mailerSend.email.send(emailParams);
    console.log('[email] Invite sent:', { to, type });
    return { sent: true };
  } catch (err) {
    const message = formatMailerSendError(err);
    console.error('[email] Invite failed:', { to, type, error: message });
    return { sent: false, error: message };
  }
}

/** Extract a readable error message from MailerSend SDK (throws { body, statusCode }) or generic errors. */
function formatMailerSendError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const o = err as { body?: unknown; statusCode?: number };
    if (o.body && typeof o.body === 'object') {
      const body = o.body as { message?: string };
      if (typeof body.message === 'string') return body.message;
      return JSON.stringify(o.body);
    }
    if (o.statusCode) return `MailerSend error (${o.statusCode})`;
  }
  return String(err);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
