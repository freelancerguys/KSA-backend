import { Payment } from '../models/Payment.js';
import { StudentNotification } from '../models/StudentNotification.js';
import { ApiError } from '../utils/ApiError.js';
import { getCurrentPeriod } from './dashboardService.js';
import { getFeeMeta } from './feeService.js';

export const getStudentNotifications = async (student, { isActive = true } = {}) => {
  const { month, year, now } = getCurrentPeriod();
  const notifications = [];

  const [pendingPayment, approvedThisMonth, rejectedRecent, feeMeta] = await Promise.all([
    Payment.findOne({ student: student._id, status: 'pending' }).sort('-createdAt'),
    Payment.findOne({ student: student._id, month, year, status: 'approved' }),
    Payment.findOne({ student: student._id, status: 'rejected' }).sort('-updatedAt'),
    getFeeMeta(student),
  ]);

  const pendingThisMonth =
    pendingPayment && pendingPayment.month === month && pendingPayment.year === year;

  if (pendingPayment) {
    notifications.push({
      id: 'pending-payment',
      fingerprint: `pending-${pendingPayment._id}-${pendingPayment.updatedAt?.getTime() || pendingPayment.createdAt?.getTime()}`,
      type: 'warning',
      title: 'Payment pending approval',
      message: `Your ${pendingPayment.month} ${pendingPayment.year} fee (₹${pendingPayment.amount}) is awaiting admin review`,
      link: '/student/fees',
    });
  }

  if (
    rejectedRecent &&
    !approvedThisMonth &&
    !(pendingPayment && new Date(pendingPayment.createdAt) >= new Date(rejectedRecent.updatedAt || rejectedRecent.createdAt))
  ) {
    notifications.push({
      id: 'rejected-payment',
      fingerprint: `rejected-${rejectedRecent._id}-${rejectedRecent.updatedAt?.getTime() || rejectedRecent.createdAt?.getTime()}`,
      type: 'error',
      title: 'Payment rejected',
      message:
        rejectedRecent.rejectionReason ||
        `Your ${rejectedRecent.month} ${rejectedRecent.year} payment was rejected — please resubmit`,
      link: '/student/fees',
    });
  }

  if (!approvedThisMonth && !pendingThisMonth) {
    const dueDay = feeMeta.dueDay || 5;
    const isPastDue = now.getDate() > dueDay;
    notifications.push({
      id: 'fee-due',
      fingerprint: `fee-due-${month}-${year}-${feeMeta.amount}`,
      type: isPastDue ? 'error' : 'info',
      title: isPastDue ? 'Monthly fee overdue' : 'Monthly fee payment due',
      message: `Submit your ${month} ${year} academy fee of ₹${feeMeta.amount}`,
      link: '/student/fees',
    });
  }

  if (approvedThisMonth?.approvedAt) {
    const daysSince = (now - new Date(approvedThisMonth.approvedAt)) / 86400000;
    if (daysSince <= 14) {
      notifications.push({
        id: 'payment-approved',
        fingerprint: `approved-${approvedThisMonth._id}-${approvedThisMonth.approvedAt.getTime()}`,
        type: 'success',
        title: 'Payment approved',
        message: `${approvedThisMonth.month} ${approvedThisMonth.year} fee cleared — view invoice in Fees`,
        link: '/student/fees',
      });
    }
  }

  if (isActive === false) {
    notifications.push({
      id: 'account-suspended',
      fingerprint: 'account-suspended',
      type: 'error',
      title: 'Account suspended',
      message: 'Contact the academy office for assistance',
      link: '/student/profile',
    });
  }

  return notifications;
};

export const applyStudentNotificationStates = async (userId, notifications) => {
  if (!notifications.length) return [];

  const keys = notifications.map((n) => n.id);
  const states = await StudentNotification.find({
    user: userId,
    notificationKey: { $in: keys },
  });

  const stateMap = new Map(states.map((s) => [s.notificationKey, s]));

  return notifications
    .filter((n) => {
      const state = stateMap.get(n.id);
      if (state?.status === 'dismissed' && state.fingerprint === n.fingerprint) return false;
      return true;
    })
    .map((n) => {
      const state = stateMap.get(n.id);
      const read = state?.status === 'read' && state.fingerprint === n.fingerprint;
      return { ...n, read: !!read };
    });
};

const upsertState = async (userId, notificationKey, fingerprint, status) => {
  return StudentNotification.findOneAndUpdate(
    { user: userId, notificationKey },
    { fingerprint, status },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const markStudentNotificationRead = async (userId, notificationKey, fingerprint) => {
  if (!notificationKey || !fingerprint) {
    throw new ApiError(400, 'Notification id and fingerprint required');
  }
  await upsertState(userId, notificationKey, fingerprint, 'read');
  return { success: true };
};

export const dismissStudentNotification = async (userId, notificationKey, fingerprint) => {
  if (!notificationKey || !fingerprint) {
    throw new ApiError(400, 'Notification id and fingerprint required');
  }
  await upsertState(userId, notificationKey, fingerprint, 'dismissed');
  return { success: true };
};
