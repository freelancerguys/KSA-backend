import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Settings } from '../models/Settings.js';
import { Achievement } from '../models/Achievement.js';
import { Blog } from '../models/Blog.js';

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Seeding database...');

  const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@kalyaniacademy.com').toLowerCase().trim();
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@12345';

  let admin = await User.findOne({ email: adminEmail }).select('+password');
  if (!admin) {
    admin = await User.create({
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      phone: '9999999999',
      isActive: true,
    });
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    admin.password = adminPassword;
    admin.role = 'admin';
    admin.isActive = true;
    await admin.save();
    console.log(`Admin updated (password reset): ${adminEmail} / ${adminPassword}`);
  }

  const defaultSettings = [
    { key: 'heroTitle', value: 'Aim Higher. Shoot Stronger.' },
    { key: 'heroSubtitle', value: 'Premier shooting academy in Kalyani' },
    { key: 'aboutText', value: 'Kalyani Shooting Academy trains champions with world-class coaching and discipline.' },
    { key: 'contactPhone', value: '+91 70037 17476' },
    { key: 'contactEmail', value: 'kalyanishooting@gmail.com' },
    { key: 'contactAddress', value: 'Kalyani, West Bengal, India' },
    { key: 'monthlyFee', value: 1500 },
    { key: 'defaultUpiId', value: process.env.DEFAULT_UPI_ID || 'academy@upi' },
    { key: 'globalUPI', value: process.env.DEFAULT_UPI_ID || 'kalyanishooting@okicici' },
    { key: 'defaultMonthlyFee', value: 1500 },
    { key: 'academyName', value: 'Kalyani Shooting Academy' },
    { key: 'paymentQrName', value: 'Kalyani Shooting Academy' },
    { key: 'paymentDueDate', value: 5 },
    { key: 'invoicePrefix', value: 'KSA' },
    { key: 'currency', value: 'INR' },
    { key: 'paymentInstructions', value: 'Scan QR, pay via any UPI app, then upload screenshot.' },
    { key: 'stats', value: { students: 120, championships: 45, medals: 200, successRate: 95 } },
    { key: 'socialLinks', value: { facebook: '#', instagram: '#', youtube: '#' } },
  ];

  for (const s of defaultSettings) {
    await Settings.findOneAndUpdate({ key: s.key }, { value: s.value }, { upsert: true });
  }

  if ((await Achievement.countDocuments()) === 0) {
    await Achievement.insertMany([
      { title: 'State Championship Gold', description: '10m Air Rifle', achievementDate: new Date('2024-06-15') },
      { title: 'National Trials Qualifier', description: 'Junior category', achievementDate: new Date('2024-09-20') },
    ]);
  }

  if ((await Blog.countDocuments()) === 0) {
    await Blog.create({
      title: 'Welcome to Kalyani Shooting Academy',
      slug: 'welcome-to-kalyani-shooting-academy',
      excerpt: 'Your journey to precision shooting starts here.',
      content: '<p>We welcome aspiring shooters to train with the best coaches.</p>',
      isPublished: true,
    });
  }

  console.log('Seed completed.');
  process.exit(0);
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
