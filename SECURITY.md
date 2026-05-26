# KSA API Security

## Implemented controls

- **Helmet** — CSP (production), HSTS, clickjacking, MIME sniffing protection
- **Rate limiting** — Global (100/15min), login (5/15min), admin routes (200/15min)
- **IP blocking** — After repeated failed logins / optional rate-limit blocks
- **Mongo sanitize** — NoSQL injection mitigation
- **XSS clean** — Input sanitization
- **HPP** — HTTP parameter pollution protection
- **CORS** — Restricted to `CLIENT_URL` and `ADMIN_URL` with credentials
- **CSRF** — Double-submit cookie + `X-CSRF-Token` header
- **JWT** — Short-lived access token (15m default), refresh in HTTP-only cookies
- **bcrypt** — Password hashing (12 rounds)
- **Password policy** — 8+ chars, upper, lower, number, special
- **Account lockout** — 5 failed attempts → 15 minute lock
- **Upload security** — JPG/JPEG/PNG/WEBP/PDF only, 5MB max, MIME + extension checks
- **Audit logs** — Admin payment approve/reject, student updates
- **Security logs** — Failed logins, lockouts, CSRF failures, rate limits
- **Production errors** — Generic messages, no stack traces

## Environment variables

See `.env.example`. In production set strong `JWT_SECRET`, `JWT_REFRESH_SECRET`, enable `FORCE_HTTPS=true`, `COOKIE_SECURE=true`.

## Deployment recommendations

- Cloudflare or similar WAF/CDN
- NGINX reverse proxy with TLS
- MongoDB authenticated user + IP allowlist
- Run `npm audit` regularly

## Optional integrations

- `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile on login (hook ready via env)
- reCAPTCHA v3 — can be added to login controllers similarly
