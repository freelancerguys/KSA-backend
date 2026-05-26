import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { ensureAdminUser } from './utils/ensureAdmin.js';
import { clearBlockedIps } from './services/securityService.js';

const start = async () => {
  await connectDB();
  if (env.nodeEnv !== 'production') clearBlockedIps();
  await ensureAdminUser();
  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
  });
};

start();
