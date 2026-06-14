# KSA API Security

## Implemented controls

- **Helmet** — CSP (production), HSTS, clickjacking, MIME sniffing protection
- **Rate limiting** — Global (100/15min), login (5/15min), admin routes (200/15min)
- **IP blocking** — After repeated failed logins / optional rate-limit blocks
- **Mongo sanitize** — NoSQL injection mitigation
- **XSS clean** — Input sanitization
- **HPP** — HTTP parameter pollution protection
- **CORS** — Restricted to `CLIENT_URL` and `ADMIN_URL`
- **JWT** — Short-lived access token (15m default) sent via `Authorization: Bearer`, refresh token stored client-side
- **Admin captcha** — Image captcha on admin login (server-generated, required)
- **bcrypt** — Password hashing (12 rounds)
- **Password policy** — 8+ chars, upper, lower, number, special
- **Account lockout** — 5 failed attempts → 15 minute lock
- **Upload security** — JPG/JPEG/PNG/WEBP/PDF only, 5MB max, MIME + extension checks
- **Audit logs** — Admin payment approve/reject, student updates
- **Security logs** — Failed logins, lockouts, rate limits
- **Production errors** — Generic messages, no stack traces

## Environment variables

See `.env.example`. In production set strong `JWT_SECRET`, `JWT_REFRESH_SECRET`, enable `FORCE_HTTPS=true`.

## Deployment recommendations

- Cloudflare or similar WAF/CDN
- NGINX reverse proxy with TLS
- MongoDB authenticated user + IP allowlist
- Run `npm audit` regularly

## Admin captcha

Admin login uses a server-generated image captcha (`GET /api/auth/captcha`). Answers expire after 5 minutes and are single-use. Failed attempts are logged as `captcha_failed`.

## Google sign-in (student login)

1. Create an OAuth 2.0 **Web application** client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add authorized JavaScript origins (e.g. `http://localhost:5173`, your production site URL).
3. Set `GOOGLE_CLIENT_ID` in backend `.env` and `VITE_GOOGLE_CLIENT_ID` in frontend `.env` (same client ID).
4. Optionally set `GOOGLE_CLIENT_SECRET` for future server-side OAuth flows (not required for current sign-in button).

Only students **already registered by admin** with a matching email can sign in with Google. Unregistered Google accounts are rejected.
