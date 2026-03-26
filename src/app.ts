import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './lib/config';
import authRoutes from './routes/authRoutes';
import liteRoutes from './routes/liteRoutes';
import overviewRoutes from './routes/overviewRoutes';
import tenantRoutes from './routes/tenantRoutes';
import userRoutes from './routes/userRoutes';
import avatarRoutes from './routes/avatarRoutes';
import liveavatarRoutes from './routes/liveavatarRoutes';
import liveavatarApiRoutes from './routes/liveavatarApiRoutes';
import * as liveavatarController from './controllers/liveavatarController';
import settingsRoutes from './routes/settingsRoutes';
import adminUserRoutes from './routes/adminUserRoutes';
import financeRoutes from './routes/financeRoutes';
import recordingRoutes from './routes/recordingRoutes';
import reportRoutes from './routes/reportRoutes';
import * as versionController from './controllers/versionController';

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // e.g. Postman, mobile
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
    if (isLocalhost || config.corsOrigins.includes(origin)) return callback(null, origin);
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '500kb' }));

// Serve uploaded files (e.g. avatar images) at /uploads/*
// Allow cross-origin embedding so the admin frontend (different port) can display images
const uploadsPath = path.join(process.cwd(), config.uploadDir);
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadsPath));

// Serve logo for email templates (same domain as API)
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for localhost in development (common when running locally)
    const isLocalhost = !req.ip || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    return config.nodeEnv !== 'production' && isLocalhost;
  },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/version', versionController.getVersion);

app.use('/api/auth', authLimiter, authRoutes);

// LiveAvatar: session-token (frontend expects /session-token) and SDK api proxy
app.post('/session-token', (req, res) => liveavatarController.proxyPostSessionToken(req, res));
app.use('/liveavatar-api', liveavatarApiRoutes);
app.use('/api/lite', liteRoutes);
app.use('/api/overview', overviewRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/avatars', avatarRoutes);
app.use('/api/liveavatar', liveavatarRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin-users', adminUserRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/report', reportRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
