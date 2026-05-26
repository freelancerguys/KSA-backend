import mongoose from 'mongoose';

const securityLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'login_failed',
        'login_success',
        'account_locked',
        'ip_blocked',
        'rate_limit',
        'csrf_failed',
        'suspicious_request',
      ],
      required: true,
    },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    identifier: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    path: { type: String, default: '' },
    message: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

securityLogSchema.index({ ip: 1, createdAt: -1 });
securityLogSchema.index({ type: 1, createdAt: -1 });

export const SecurityLog = mongoose.model('SecurityLog', securityLogSchema);
