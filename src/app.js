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
import { apiStack } from './middlewares/apiMount.js';
import { apiPathRewrite } from './middlewares/apiPathRewrite.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { initCloudinary } from './config/cloudinary.js';
import { httpsRedirect } from './middlewares/httpsRedirect.js';
import { ipBlocker } from './middlewares/ipBlocker.js';
import { globalLimiter } from './middlewares/rateLimiters.js';
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

const corsOrigins = [env.clientUrl, env.adminUrl].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (corsOrigins.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    const apex = new URL(env.clientUrl).hostname;
    if (host === apex || host.endsWith(`.${apex}`)) return true;
  } catch {
    /* ignore */
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
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

app.use(apiPathRewrite);
app.use('/api', ...apiStack);
app.use(...apiStack);

app.use(notFound);
app.use(errorHandler);

export default app;
