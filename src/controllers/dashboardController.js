import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getDashboardStats,
  getDashboardRevenue,
  getDashboardPayments,
  getDashboardActivities,
  getTopShooters,
  getDashboardNotifications,
} from '../services/dashboardService.js';

export const stats = asyncHandler(async (req, res) => {
  const data = await getDashboardStats();
  res.json({ success: true, data });
});

export const revenue = asyncHandler(async (req, res) => {
  const data = await getDashboardRevenue();
  const topShooters = await getTopShooters(5);
  res.json({ success: true, data: { ...data, topShooters } });
});

export const payments = asyncHandler(async (req, res) => {
  const data = await getDashboardPayments({
    page: Number(req.query.page) || 1,
    limit: Math.min(Number(req.query.limit) || 10, 50),
    status: req.query.status || '',
    search: req.query.search || '',
  });
  res.json({ success: true, data });
});

export const activities = asyncHandler(async (req, res) => {
  const [activityData, notifications] = await Promise.all([
    getDashboardActivities(Number(req.query.limit) || 15),
    getDashboardNotifications(),
  ]);
  res.json({
    success: true,
    data: { ...activityData, notifications },
  });
});
