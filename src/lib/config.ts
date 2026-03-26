import dotenv from 'dotenv';

dotenv.config();

function env(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) throw new Error(`Missing required env: ${key}`);
  return value;
}

const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3002', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigin: env('CORS_ORIGIN', 'http://localhost:3001'),
  /** Allowed CORS origins. In dev, includes common localhost ports (e.g. 8080 for Flutter). Set CORS_ORIGINS to override. */
  corsOrigins: (() => {
    if (process.env.CORS_ORIGINS) {
      return process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const primary = process.env.CORS_ORIGIN ?? 'http://localhost:3001';
    const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
    const devOrigins = ['http://localhost:3001', 'http://localhost:8080', 'http://localhost:3000', 'http://localhost:5000', 'http://localhost:5173'];
    return isDev ? [...new Set([primary, ...devOrigins])] : [primary];
  })(),
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-in-production-min-32-chars'),
  liteAdminEmail: env('LITE_ADMIN_EMAIL', 'liteadmin@example.com'),
  liteAdminPassword: process.env.LITE_ADMIN_PASSWORD ?? '',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE, 10) : DEFAULT_MAX_FILE_SIZE,
  // MailerSend (invite emails): optional; if not set, sendInviteEmail no-ops or logs
  mailerSendApiKey: process.env.MAILERSEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM ?? '',
  /** Optional display name for invite emails, e.g. "DALE Invite". Used as MailerSend sender name. */
  mailFromName: process.env.MAIL_FROM_NAME ?? '',
  appUrl: process.env.APP_URL ?? process.env.LOGIN_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:3001',
  /** Admin app URL for admin invite emails (DaleAdminFrontend). Set ADMIN_APP_URL. */
  adminAppUrl: process.env.ADMIN_APP_URL ?? process.env.APP_URL ?? 'http://localhost:5173',
  /** Full URL for logo in emails (e.g. https://api.example.com/logo.png). Defaults to API base in dev. Set LOGO_URL in production. */
  logoUrl:
    process.env.LOGO_URL ??
    ((process.env.NODE_ENV ?? 'development') !== 'production'
      ? `http://localhost:${process.env.PORT ?? '3002'}/logo.png`
      : ''),
  // MailerLite: optional; if not set, syncSubscriber no-ops
  mailerliteApiToken: process.env.MAILERLITE_API_TOKEN ?? '',
  /** LiveAvatar API key for proxy; optional for public avatars, recommended for contexts */
  liveavatarApiKey: process.env.LIVEAVATAR_API_KEY ?? '',
  /** S3 for session recordings. If not set, uploads are skipped (local dev). */
  s3RecordingsBucket: process.env.S3_RECORDINGS_BUCKET ?? '',
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  /** Must match client builds (VITE_CONSENT_DOCUMENT_VERSION). Required for change-password consent. */
  consentDocumentVersion: process.env.CONSENT_DOCUMENT_VERSION ?? '2025-03-26',
  /** Override npm version in GET /api/version */
  apiVersion: process.env.API_VERSION ?? '',
  gitSha: process.env.GIT_SHA ?? '',
  gitBranch: process.env.GIT_BRANCH ?? '',
  gitCommitMessage: process.env.GIT_COMMIT_MESSAGE ?? '',
  buildDescription: process.env.BUILD_DESCRIPTION ?? '',
} as const;
