# POPIA alignment (South Africa)

This application processes personal data in line with the Protection of Personal Information Act (POPIA). The following measures are in place:

- **Purpose and minimality:** Data collected is limited to what is necessary for Lite Admin (tenants, users, sessions, coaching avatars, admin users). No Settings/org-level data is stored by this API.

- **Retention:** Sessions support optional soft delete (`deletedAt`). Configure retention (e.g. `SESSION_RETENTION_DAYS`) and run a scheduled job to purge or anonymise data beyond the retention period.

- **Access control:** All API routes except `/health` and `POST /api/auth/login` require a valid JWT. Only authenticated Lite Admin users can access tenant, user, session, and avatar data.

- **Data subject rights:** Data is keyed by tenant and user so that export and deletion requests can be fulfilled. Avoid storing unnecessary PII; do not log request bodies, passwords, or tokens.

- **Security of processing:** Passwords are hashed (bcrypt); HTTPS in production; no sensitive data in logs; CORS restricted to known frontend origin(s). Store database and backups in a controlled environment. Document data residency (e.g. `DATA_RESIDENCY`) where required.
