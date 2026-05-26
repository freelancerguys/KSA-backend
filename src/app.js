import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import hpp from 'hpp';
import xss from 'xss-clean';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import routes from './routes/index.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { initCloudinary } from './config/cloudinary.js';
import { httpsRedirect } from './middlewares/httpsRedirect.js';
import { ipBlocker } from './middlewares/ipBlocker.js';
import { globalLimiter } from './middlewares/rateLimiters.js';
import { csrfProtection } from './middlewares/csrf.js';
import dns from 'dns';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

initCloudinary();
// Force IPv4 first
dns.setDefaultResultOrder("ipv4first");

// Use Google DNS
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Test DNS
dns.lookup("google.com", (err, address) => {
  if (err) {
    console.error("DNS Error:", err);
  } else {
    console.log("DNS Working:", address);
  }
});

app.set('trust proxy', 1);

// Health checks — no CSRF, rate limit, or IP block (for Nginx/monitoring)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);

app.use(httpsRedirect);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.nodeEnv === 'production',
    hsts: env.forceHttps
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  })
);

app.use(
  cors({
    origin: [env.clientUrl, env.adminUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Portal'],
  })
);

app.use(compression());
app.use(hpp());
app.use(globalLimiter);
app.use(ipBlocker);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());

app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  dotfiles: 'deny',
  index: false,
}));

// Nginx sometimes strips /api (proxy_pass .../;). Mount auth at /auth as well.
app.use('/auth', csrfProtection, authRoutes);

app.use('/api', csrfProtection, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
