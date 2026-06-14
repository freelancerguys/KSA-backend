import mongoose from 'mongoose';

const studentNotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notificationKey: { type: String, required: true, trim: true },
    fingerprint: { type: String, required: true, trim: true },
    status: { type: String, enum: ['read', 'dismissed'], required: true },
  },
  { timestamps: true }
);

studentNotificationSchema.index({ user: 1, notificationKey: 1 }, { unique: true });

export const StudentNotification = mongoose.model('StudentNotification', studentNotificationSchema);
