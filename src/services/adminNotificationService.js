import { AdminNotification } from '../models/AdminNotification.js';
import { ApiError } from '../utils/ApiError.js';

export const applyAdminNotificationStates = async (adminId, notifications) => {
  if (!notifications.length) return [];

  const keys = notifications.map((n) => n.id);
  const states = await AdminNotification.find({
    admin: adminId,
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

const upsertState = async (adminId, notificationKey, fingerprint, status) => {
  return AdminNotification.findOneAndUpdate(
    { admin: adminId, notificationKey },
    { fingerprint, status },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const markNotificationRead = async (adminId, notificationKey, fingerprint) => {
  if (!notificationKey || !fingerprint) {
    throw new ApiError(400, 'Notification id and fingerprint required');
  }
  await upsertState(adminId, notificationKey, fingerprint, 'read');
  return { success: true };
};

export const dismissNotification = async (adminId, notificationKey, fingerprint) => {
  if (!notificationKey || !fingerprint) {
    throw new ApiError(400, 'Notification id and fingerprint required');
  }
  await upsertState(adminId, notificationKey, fingerprint, 'dismissed');
  return { success: true };
};

export const getUnreadCount = (notifications) =>
  notifications.filter((n) => !n.read).length;
