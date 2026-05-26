import { User } from '../models/User.js';
import { env } from '../config/env.js';

export const ensureAdminUser = async () => {
  const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@kalyaniacademy.com').toLowerCase().trim();
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';

  let admin = await User.findOne({ email: adminEmail }).select('+password');

  if (!admin) {
    await User.create({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      phone: '9999999999',
      isActive: true,
    });
    console.log(`[auth] Admin account created: ${adminEmail}`);
    return;
  }

  let changed = false;
  if (admin.role !== 'admin') {
    admin.role = 'admin';
    changed = true;
  }
  if (!admin.isActive) {
    admin.isActive = true;
    changed = true;
  }

  if (env.nodeEnv === 'development') {
    const passwordOk = await admin.comparePassword(adminPassword);
    if (!passwordOk) {
      admin.password = adminPassword;
      changed = true;
      console.log(`[auth] Admin password synced from .env`);
    }
  }

  if (changed) {
    await admin.save();
    console.log(`[auth] Admin account updated: ${adminEmail}`);
  }
};
