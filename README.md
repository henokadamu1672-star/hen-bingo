# Hen Lite starter

## Start locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env`; change `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
3. Run `npm install`, then `npm start`.
4. Open http://localhost:3000.

Features: email/password registration, admin account created on first run, Bingo/Mobile/Computer service choices, message and image/PDF/text attachment submission, user-private request history, admin-only all-message inbox and attachment downloads, tap-to-call contact numbers.

Security/deployment note: this is a starter and needs production hardening (rate limiting, CSRF protection, email verification/password reset, upload content validation, backups). On hosts with ephemeral storage, local SQLite and uploads may be lost during redeploys; use a managed database and private persistent storage before real public use. Never deploy with the example password or fallback session secret. Do not upload `.env`, `data/`, or `uploads/` to GitHub.
