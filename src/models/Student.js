import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, default: 'other' },
    file: { type: String, required: true },
  },
  { timestamps: true }
);

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    studentId: { type: String, required: true, unique: true, uppercase: true },
    photo: { type: String, default: '' },

    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true },
    alternatePhone: { type: String, default: '' },
    address: { type: String, default: '' },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
      default: '',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
      default: '',
    },
    parentGuardianName: { type: String, trim: true, default: '' },
    emergencyContact: { type: String, default: '' },
    personalBio: { type: String, default: '' },
    joiningDate: { type: Date, default: Date.now },

    wbShooterId: { type: String, default: '', trim: true, uppercase: true },
    nraiShooterId: { type: String, default: '', trim: true, uppercase: true },
    shootingCategory: { type: String, default: '' },
    preferredWeaponType: { type: String, default: '' },
    assignedCoach: { type: String, default: '' },
    shootingExperience: { type: String, default: '' },
    competitionLevel: { type: String, default: '' },

    customMonthlyFee: { type: Number },
    isCustomFeeEnabled: { type: Boolean, default: false },
    feeDiscount: { type: Number, default: 0, min: 0 },
    feeDueDay: { type: Number, default: 5, min: 1, max: 28 },

    documents: [documentSchema],

    // Legacy — use feeService for effective amount
    feeAmount: { type: Number },
    upiId: { type: String, default: '' },
  },
  { timestamps: true }
);

studentSchema.index({ wbShooterId: 1 });
studentSchema.index({ nraiShooterId: 1 });
studentSchema.index({ fullName: 'text', studentId: 'text', wbShooterId: 'text', nraiShooterId: 'text' });

export const Student = mongoose.model('Student', studentSchema);
