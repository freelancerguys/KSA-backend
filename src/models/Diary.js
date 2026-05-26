import mongoose from 'mongoose';

const diarySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    entryDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

diarySchema.index({ student: 1, entryDate: -1 });

export const Diary = mongoose.model('Diary', diarySchema);
