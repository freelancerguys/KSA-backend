import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notificationKey: { type: String, required: true, trim: true },
    fingerprint: { type: String, required: true, trim: true },
    status: { type: String, enum: ['read', 'dismissed'], required: true },
  },
  { timestamps: true }
);

adminNotificationSchema.index({ admin: 1, notificationKey: 1 }, { unique: true });

export const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);
