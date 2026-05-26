import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    caption: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    eventDate: { type: Date, default: Date.now },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Activity = mongoose.model('Activity', activitySchema);
