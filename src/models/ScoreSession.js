import mongoose from 'mongoose';

const shotSchema = new mongoose.Schema(
  { value: { type: Number, required: true, min: 0, max: 10.9 } },
  { _id: false }
);

const seriesSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Series' },
    shots: {
      type: [shotSchema],
      validate: {
        validator: (v) => v.length <= 10,
        message: 'A series cannot have more than 10 shots',
      },
    },
    isComplete: { type: Boolean, default: false },
  },
  { _id: true }
);

const scoreSessionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    sessionDate: { type: Date, required: true },
    notes: { type: String, default: '' },
    series: [seriesSchema],
  },
  { timestamps: true }
);

scoreSessionSchema.index({ student: 1, sessionDate: -1 });

export const ScoreSession = mongoose.model('ScoreSession', scoreSessionSchema);
