# dale_api

Node.js + MySQL backend for Lite Admin (Overview, Tenants, Avatar library). Uses Express, Prisma, Zod, and JWT auth.

**Database:** Local MySQL only (no Docker). Create the database on your local MySQL server, then run migrations and seed.

**Ports:** DaleAdminFrontend's dev server runs on port 3001. To avoid 404s on `/api/*`, run this API on a different port (default 3002). Set the frontend `.env` to `VITE_API_URL=http://localhost:3002/api` so login and API calls hit this server.

## Setup

1. **Local MySQL:** Create the database, e.g. `mysql -u root -e "CREATE DATABASE IF NOT EXISTS dale_lite_admin;"` (or use your MySQL user/password).
2. Copy `.env.example` to `.env` and set `DATABASE_URL` (e.g. `mysql://user:password@localhost:3306/dale_lite_admin`), `JWT_SECRET`, `CORS_ORIGIN`, and `LITE_ADMIN_PASSWORD`.
3. Run migrations: `npm run db:migrate` (creates tables on your local MySQL).
4. Seed: `npm run db:seed`.
5. Start: `npm run dev` (API listens on PORT, default 3002). In DaleAdminFrontend set `VITE_API_URL=http://localhost:3002/api` so login works.

## Scripts

- `npm run dev` — start with ts-node-dev
- `npm run build` — compile TypeScript
- `npm start` — run compiled app
- `npm run db:migrate` — run Prisma migrations
- `npm run db:seed` — seed admin user and sample data
- `npm run test` — run test suite (see Tests)

## Environment

See `.env.example`. Required: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `JWT_SECRET`, `LITE_ADMIN_EMAIL`, `LITE_ADMIN_PASSWORD`. Optional: `DATA_RESIDENCY`, `SESSION_RETENTION_DAYS` for POPIA/docs.

## API

- `GET /health` — health check (no auth).
- `POST /api/auth/login` — body `{ email, password }`; returns JWT.
- All other `/api/*` routes require `Authorization: Bearer <token>`.

Overview: `GET /api/overview/kpis`, `/usage-trend`, `/most-used-coaches`, `/score-distribution`, `/plan-distribution`, `/most-active-users`.

Tenants: `GET/POST /api/tenants`, `GET /api/tenants/:id`, `GET /api/tenants/:id/users`. Users: `GET /api/users/:id`, `GET /api/users/:id/sessions`.

Avatars: `GET/POST/PATCH /api/avatars`, `GET /api/avatars/:id`, `PATCH /api/avatars/:id/live-config`.

## Security

Helmet, rate limiting (global + stricter on login), CORS to `CORS_ORIGIN`, request body size limit, Zod validation. Passwords hashed with bcrypt; no sensitive data in logs.

## Tests

Run with `npm run test`. Uses Vitest and supertest; set `DATABASE_URL_TEST` for a separate test database or use in-memory SQLite if configured. Tests cover health, auth, and all Overview, Tenants, Users, and Avatars endpoints.

## POPIA

See [COMPLIANCE.md](./COMPLIANCE.md) for data purpose, retention, access control, and security measures.
