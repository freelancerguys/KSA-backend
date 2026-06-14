import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getDashboardStats,
  getDashboardRevenue,
  getDashboardPayments,
  getDashboardActivities,
  getTopShooters,
  getDashboardNotifications,
} from '../services/dashboardService.js';
import {
  applyAdminNotificationStates,
  markNotificationRead as saveNotificationRead,
  dismissNotification as saveNotificationDismiss,
} from '../services/adminNotificationService.js';

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
  const [activityData, rawNotifications] = await Promise.all([
    getDashboardActivities(Number(req.query.limit) || 15),
    getDashboardNotifications(),
  ]);
  const notifications = await applyAdminNotificationStates(req.user._id, rawNotifications);
  res.json({
    success: true,
    data: { ...activityData, notifications },
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fingerprint } = req.body;
  await saveNotificationRead(req.user._id, id, fingerprint);
  res.json({ success: true, message: 'Notification marked as read' });
});

export const dismissNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fingerprint } = req.body;
  await saveNotificationDismiss(req.user._id, id, fingerprint);
  res.json({ success: true, message: 'Notification removed' });
});
