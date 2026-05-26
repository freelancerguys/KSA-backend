import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    pdfPath: { type: String, default: '' },
    downloadFilename: { type: String, default: '' },
    amount: { type: Number, required: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    transactionId: { type: String, default: '' },
    paymentMethod: { type: String, default: 'UPI' },
    paymentStatus: { type: String, default: 'approved' },
    paymentDate: { type: Date },
    generatedDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

export const Invoice = mongoose.model('Invoice', invoiceSchema);
