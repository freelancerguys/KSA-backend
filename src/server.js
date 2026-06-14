import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { ensureAdminUser } from './utils/ensureAdmin.js';
import { clearBlockedIps } from './services/securityService.js';

const start = async () => {
  await connectDB();
  if (env.nodeEnv !== 'production') clearBlockedIps();
  await ensureAdminUser();
  if (env.googleClientId) {
    console.log('[auth] Google sign-in enabled');
  } else {
    console.warn('[auth] Google sign-in disabled — set GOOGLE_CLIENT_ID in backend/.env');
  }
  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
  });
};

start();
