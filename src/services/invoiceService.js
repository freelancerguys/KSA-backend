import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { Invoice } from '../models/Invoice.js';
import { getPaymentSettings } from './settingsService.js';
import { formatCurrency } from '../utils/currency.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const invoicesDir = path.join(__dirname, '../../uploads/invoices');
const logoPath = path.join(__dirname, '../../assets/ksalogo.png');
const fontRegularPath = path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
const fontBoldPath = path.join(__dirname, '../../assets/fonts/NotoSans-Bold.ttf');

const PDF_FONT = 'KSA-NotoSans';
const PDF_FONT_BOLD = 'KSA-NotoSans-Bold';

function registerPdfFonts(doc) {
  if (fs.existsSync(fontRegularPath)) {
    doc.registerFont(PDF_FONT, fontRegularPath);
    doc.registerFont(PDF_FONT_BOLD, fs.existsSync(fontBoldPath) ? fontBoldPath : fontRegularPath);
    return { regular: PDF_FONT, bold: PDF_FONT_BOLD };
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

const BRAND = {
  primary: '#FFD600',
  secondary: '#111111',
  text: '#111111',
  muted: '#5C5C5C',
  border: '#E0E0E0',
  surface: '#F7F7F5',
  white: '#FFFFFF',
  paid: '#2E7D32',
  pending: '#FFD600',
  rejected: '#C62828',
};

const PAGE = { w: 595.28, h: 841.89 };
const PAD = { top: 30, bottom: 30, left: 40, right: 40 };
const SECTION_GAP = 14;
const TITLE_MB = 10;
const CARD_PAD = 15;
const TABLE_ROW_H = 35;
const LINE_GAP = 4;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ACADEMY = {
  name: 'Kalyani Shooting Academy',
  address: 'Block A, Kalyani, West Bengal',
  phone: '+91 70037 17476',
  email: 'kalyanishooting@gmail.com',
  website: 'kalyanishootingacademy.in',
};

const THANK_YOU_MSG =
  'Thank you for your payment and continued trust in Kalyani Shooting Academy. We appreciate your dedication and commitment toward excellence in shooting sports.';

if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

export { formatCurrency } from '../utils/currency.js';

export const formatInvoiceDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export const formatGeneratedDateTime = (date) =>
  new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

export const formatDueDate = (month, year, dueDay = 5) => {
  const idx = MONTHS.indexOf(month);
  if (idx < 0) return '—';
  const d = new Date(year, idx, Math.min(Math.max(dueDay, 1), 28));
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const buildDownloadFilename = (studentName, month, year) => {
  const safeName = (studentName || 'Student').replace(/[^a-zA-Z0-9]/g, '') || 'Student';
  const safeMonth = (month || 'Month').replace(/[^a-zA-Z0-9]/g, '');
  return `KSA_Invoice_${safeName}_${safeMonth}_${year}.pdf`;
};

export const generateInvoiceNumber = async (settings, year = new Date().getFullYear()) => {
  const prefix = settings.invoicePrefix || 'KSA';
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);
  const count = await Invoice.countDocuments({
    createdAt: { $gte: startOfYear, $lt: endOfYear },
  });
  return `${prefix}-INV-${year}-${String(count + 1).padStart(5, '0')}`;
};

const statusColors = (status) => {
  const s = (status || 'approved').toLowerCase();
  if (s === 'paid' || s === 'approved') return { bg: BRAND.paid, fg: BRAND.white, label: 'PAID' };
  if (s === 'pending') return { bg: BRAND.pending, fg: BRAND.secondary, label: 'PENDING' };
  if (s === 'rejected') return { bg: BRAND.rejected, fg: BRAND.white, label: 'REJECTED' };
  return { bg: BRAND.paid, fg: BRAND.white, label: s.toUpperCase() };
};

/** Flow-based layout helper — tracks Y cursor, never uses fixed overlapping coords */
class InvoiceLayout {
  constructor(doc, fonts) {
    this.doc = doc;
    this.font = fonts.regular;
    this.fontBold = fonts.bold;
    this.x = PAD.left;
    this.contentW = PAGE.w - PAD.left - PAD.right;
    this.y = PAD.top;
    this.footerReserve = 100;
  }

  get maxY() {
    return PAGE.h - PAD.bottom - this.footerReserve;
  }

  ensureSpace(needed) {
    if (this.y + needed > this.maxY) {
      this.doc.addPage({ size: 'A4', margin: 0 });
      this.y = PAD.top;
      drawWatermark(this.doc);
    }
  }

  advance(h) {
    this.y += h;
  }

  gap(n = SECTION_GAP) {
    this.y += n;
  }

  textHeight(text, options = {}) {
    return this.doc.heightOfString(text, {
      width: this.contentW - CARD_PAD * 2,
      lineGap: LINE_GAP,
      ...options,
    });
  }

  drawSectionTitle(title) {
    this.ensureSpace(36);
    this.doc.fillColor(BRAND.secondary).font(this.fontBold).fontSize(11);
    this.doc.text(title.toUpperCase(), this.x, this.y, { width: this.contentW });
    const lineY = this.y + 14 + TITLE_MB;
    this.doc
      .moveTo(this.x, lineY)
      .lineTo(this.x + 130, lineY)
      .lineWidth(2)
      .stroke(BRAND.primary);
    this.y = lineY + 8;
  }

  drawCard(lines, options = {}) {
    const innerW = this.contentW - CARD_PAD * 2;
    const lineSpacing = options.lineSpacing ?? 18;
    let innerH = 0;

    lines.forEach((line) => {
      const fontSize = line.size || 10;
      const font = line.bold ? this.fontBold : this.font;
      this.doc.font(font).fontSize(fontSize);
      const h = this.doc.heightOfString(String(line.text), {
        width: innerW,
        lineGap: LINE_GAP,
      });
      innerH += h + (line.extraGap || 0) + (lineSpacing - fontSize - LINE_GAP);
    });

    const boxH = CARD_PAD * 2 + innerH;
    this.ensureSpace(boxH + 4);
    const boxY = this.y;

    this.doc.roundedRect(this.x, boxY, this.contentW, boxH, 6).fill(BRAND.surface);
    this.doc.roundedRect(this.x, boxY, this.contentW, boxH, 6).lineWidth(1).stroke(BRAND.border);

    let ty = boxY + CARD_PAD;
    lines.forEach((line) => {
      const fontSize = line.size || 10;
      this.doc
        .fillColor(line.muted ? BRAND.muted : BRAND.text)
        .font(line.bold ? this.fontBold : this.font)
        .fontSize(fontSize);
      const textH = this.doc.heightOfString(String(line.text), {
        width: innerW,
        lineGap: LINE_GAP,
      });
      this.doc.text(String(line.text), this.x + CARD_PAD, ty, {
        width: innerW,
        lineGap: LINE_GAP,
      });
      ty += textH + (line.extraGap || 0) + 6;
    });

    this.y = boxY + boxH;
  }

  drawKeyValueCard(pairs) {
    const lines = pairs.map(({ label, value, bold }) => ({
      text: `${label}: ${value ?? '—'}`,
      bold,
      size: 10,
    }));
    this.drawCard(lines);
  }

  drawPaymentTable(payment, dueDateStr) {
    const cols = [
      { label: 'Description', w: 0.32 },
      { label: 'Month', w: 0.18 },
      { label: 'Due Date', w: 0.18 },
      { label: 'Amount', w: 0.16 },
      { label: 'Status', w: 0.16 },
    ];
    const totalH = TABLE_ROW_H * 2;
    this.ensureSpace(totalH);

    const startY = this.y;
    let cx = this.x;

    this.doc.rect(this.x, startY, this.contentW, TABLE_ROW_H).fill(BRAND.secondary);
    cols.forEach((col) => {
      const cw = this.contentW * col.w;
      this.doc.fillColor(BRAND.primary).font(this.fontBold).fontSize(9);
      this.doc.text(col.label, cx + 10, startY + 12, { width: cw - 20 });
      cx += cw;
    });

    const rowY = startY + TABLE_ROW_H;
    cx = this.x;
    const status = payment.status || 'approved';
    const values = [
      'Monthly Fees',
      `${payment.month} ${payment.year}`,
      dueDateStr,
      formatCurrency(payment.amount),
    ];

    this.doc.rect(this.x, rowY, this.contentW, TABLE_ROW_H).fill(BRAND.white);
    this.doc.rect(this.x, rowY, this.contentW, TABLE_ROW_H).stroke(BRAND.border);

    cols.forEach((col, i) => {
      const cw = this.contentW * col.w;
      if (i === 4) {
        drawStatusBadge(this.doc, cx + 10, rowY + 7, status);
      } else {
        this.doc
          .fillColor(BRAND.text)
          .font(i === 3 ? this.fontBold : this.font)
          .fontSize(10);
        this.doc.text(values[i], cx + 10, rowY + 12, { width: cw - 20 });
      }
      cx += cw;
    });

    this.y = rowY + TABLE_ROW_H;
  }

  drawSummaryTable(rows) {
    const labelW = 210;
    const valueW = this.contentW - labelW;
    const blockH = TABLE_ROW_H * rows.length;
    this.ensureSpace(blockH);

    rows.forEach((row, i) => {
      const ry = this.y + i * TABLE_ROW_H;
      this.doc.rect(this.x, ry, this.contentW, TABLE_ROW_H).fill(row.highlight ? BRAND.primary : BRAND.white);
      this.doc.rect(this.x, ry, this.contentW, TABLE_ROW_H).stroke(BRAND.border);
      this.doc
        .fillColor(row.highlight ? BRAND.secondary : BRAND.muted)
        .font(this.fontBold)
        .fontSize(9);
      this.doc.text(row.label, this.x + 12, ry + 12, { width: labelW - 24 });
      this.doc
        .fillColor(BRAND.text)
        .font(row.highlight ? this.fontBold : this.font)
        .fontSize(10);
      this.doc.text(String(row.value), this.x + labelW + 12, ry + 12, { width: valueW - 24 });
    });

    this.y += blockH;
  }

  drawThankYouCard() {
    const innerW = this.contentW - 40;
    this.doc.font(this.fontBold).fontSize(14);
    const titleH = this.doc.heightOfString('Thank You!', { width: innerW });
    this.doc.font(this.font).fontSize(9);
    const msgH = this.doc.heightOfString(THANK_YOU_MSG, {
      width: innerW,
      align: 'center',
      lineGap: 5,
    });

    const boxH = CARD_PAD * 2 + titleH + 12 + msgH + CARD_PAD;
    this.ensureSpace(boxH + SECTION_GAP);

    const boxY = this.y;
    this.doc.roundedRect(this.x, boxY, this.contentW, boxH, 8).fill(BRAND.primary);
    this.doc.roundedRect(this.x + 1, boxY + 1, this.contentW - 2, boxH - 2, 7).lineWidth(1).stroke(BRAND.secondary);

    let ty = boxY + CARD_PAD;
    this.doc.fillColor(BRAND.secondary).font(this.fontBold).fontSize(14);
    this.doc.text('Thank You!', this.x, ty, { width: this.contentW, align: 'center' });
    ty += titleH + 12;

    this.doc.fillColor(BRAND.text).font(this.font).fontSize(9);
    this.doc.text(THANK_YOU_MSG, this.x + 20, ty, {
      width: this.contentW - 40,
      align: 'center',
      lineGap: 5,
    });

    this.y = boxY + boxH;
  }

  drawFooter(academyName) {
    this.gap(24);
    this.ensureSpace(80);

    const lines = [
      { text: 'Generated automatically by KSA Management System', size: 8 },
      { text: `Support: ${ACADEMY.phone} · ${ACADEMY.email}`, size: 8 },
      { text: 'This is a system-generated invoice and does not require signature.', size: 8 },
      { text: `© ${new Date().getFullYear()} ${academyName}. All rights reserved.`, size: 7 },
    ];

    this.doc
      .moveTo(this.x, this.y)
      .lineTo(this.x + this.contentW, this.y)
      .stroke(BRAND.border);
    this.y += 14;

    lines.forEach((line) => {
      this.doc.fillColor(BRAND.muted).font(this.font).fontSize(line.size);
      const h = this.doc.heightOfString(line.text, { width: this.contentW, align: 'center' });
      this.doc.text(line.text, this.x, this.y, { width: this.contentW, align: 'center' });
      this.y += h + 8;
    });
  }
}

function drawWatermark(doc) {
  if (!fs.existsSync(logoPath)) return;
  doc.save();
  doc.opacity(0.04);
  const w = 260;
  const h = 220;
  doc.image(logoPath, (PAGE.w - w) / 2, (PAGE.h - h) / 2 - 40, { fit: [w, h] });
  doc.opacity(1);
  doc.restore();
}

function drawStatusBadge(doc, x, y, status) {
  const { bg, fg, label } = statusColors(status);
  const w = 72;
  const h = 22;
  doc.save();
  doc.roundedRect(x, y, w, h, 4).fill(bg);
  doc.fillColor(fg).font(PDF_FONT_BOLD).fontSize(9);
  doc.text(label, x, y + 6, { width: w, align: 'center' });
  doc.restore();
}

export const generateInvoicePdf = async ({ payment, student, invoice }) => {
  const settings = await getPaymentSettings();
  const invoiceNumber = invoice?.invoiceNumber || 'KSA-INV-PENDING';
  const generatedAt = invoice?.generatedDate || new Date();
  const paymentDate = invoice?.paymentDate || payment.approvedAt || payment.createdAt;
  const paymentMethod = invoice?.paymentMethod || 'UPI';
  const dueDateStr = formatDueDate(payment.month, payment.year, student.feeDueDay || 5);
  const downloadFilename =
    invoice?.downloadFilename || buildDownloadFilename(student.fullName, payment.month, payment.year);
  const storageName = `invoice-${invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
  const filepath = path.join(invoicesDir, storageName);
  const academyName = settings.academyName || ACADEMY.name;
  const summaryStatus =
    (payment.status || 'approved').toLowerCase() === 'approved' ? 'PAID' : (payment.status || '').toUpperCase();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    const fonts = registerPdfFonts(doc);
    drawWatermark(doc);

    const layout = new InvoiceLayout(doc, fonts);

    // Accent bar
    doc.rect(0, 0, PAGE.w, 5).fill(BRAND.primary);

    // Header
    const headerStartY = layout.y;
    const logoW = 72;
    const logoH = 58;
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, PAD.left, headerStartY, { fit: [logoW, logoH] });
    }

    const headTextX = PAD.left + (fs.existsSync(logoPath) ? logoW + 12 : 0);
    doc.fillColor(BRAND.secondary).font(fonts.bold).fontSize(15);
    doc.text(academyName, headTextX, headerStartY + 2, { width: layout.contentW * 0.5 });
    doc.fillColor(BRAND.muted).font(fonts.regular).fontSize(9);
    doc.text('Official Fee Payment Invoice', headTextX, headerStartY + 22);

    const metaW = 200;
    const metaX = PAGE.w - PAD.right - metaW;
    doc.fillColor(BRAND.text).font(fonts.bold).fontSize(9);
    doc.text(`Invoice No: ${invoiceNumber}`, metaX, headerStartY, { width: metaW, align: 'right' });
    doc.font(fonts.regular).fontSize(9).fillColor(BRAND.muted);
    doc.text(`Invoice Date: ${formatInvoiceDate(paymentDate)}`, metaX, headerStartY + 14, {
      width: metaW,
      align: 'right',
    });
    doc.text(`Generated On: ${formatGeneratedDateTime(generatedAt)}`, metaX, headerStartY + 28, {
      width: metaW,
      align: 'right',
    });

    layout.y = headerStartY + logoH + 24;

    // Academy details — simple stacked lines (no overlapping labels)
    layout.drawSectionTitle('Academy Details');
    layout.drawCard([
      { text: academyName, bold: true, size: 11 },
      { text: ACADEMY.address, size: 10 },
      { text: ACADEMY.phone, size: 10 },
      { text: ACADEMY.email, size: 10 },
      { text: ACADEMY.website, size: 10 },
    ]);
    layout.gap();

    // Student details — label: value per line
    layout.drawSectionTitle('Student Details');
    layout.drawKeyValueCard([
      { label: 'Student Name', value: student.fullName, bold: true },
      { label: 'KSA ID', value: student.studentId },
      { label: 'NRAI ID', value: student.nraiShooterId || '—' },
      { label: 'WB Shooter ID', value: student.wbShooterId || '—' },
      { label: 'Phone', value: student.phone },
      { label: 'Email', value: student.email || student.user?.email || '—' },
    ]);
    layout.gap();

    layout.drawSectionTitle('Payment Details');
    layout.drawPaymentTable(payment, dueDateStr);
    layout.gap();

    layout.drawSectionTitle('Payment Summary');
    layout.drawSummaryTable([
      { label: 'Total Amount Paid', value: formatCurrency(payment.amount), highlight: true },
      { label: 'Payment Method', value: paymentMethod },
      { label: 'Transaction ID', value: payment.transactionId || 'N/A' },
      { label: 'Payment Date', value: formatInvoiceDate(paymentDate) },
      { label: 'Payment Status', value: summaryStatus },
    ]);
    layout.gap();

    layout.drawThankYouCard();
    layout.drawFooter(academyName);

    doc.end();
    stream.on('finish', () => resolve({ filename: storageName, filepath, downloadFilename }));
    stream.on('error', reject);
  });
};

export const createInvoiceForPayment = async (payment, student) => {
  const existing = await Invoice.findOne({ payment: payment._id });
  if (existing) {
    await generateInvoicePdf({ payment, student, invoice: existing });
    return { invoice: existing };
  }

  const settings = await getPaymentSettings();
  const year = payment.year || new Date().getFullYear();
  const invoiceNumber = await generateInvoiceNumber(settings, year);
  const generatedAt = new Date();
  const paymentDate = payment.approvedAt || payment.createdAt;
  const dueDate = (() => {
    const idx = MONTHS.indexOf(payment.month);
    if (idx < 0) return null;
    return new Date(year, idx, Math.min(Math.max(student.feeDueDay || 5, 1), 28));
  })();
  const downloadFilename = buildDownloadFilename(student.fullName, payment.month, payment.year);

  const invoiceDraft = {
    invoiceNumber,
    generatedDate: generatedAt,
    paymentDate,
    downloadFilename,
    paymentMethod: 'UPI',
    paymentStatus: payment.status === 'approved' ? 'paid' : payment.status,
    dueDate,
  };

  const { filename, filepath } = await generateInvoicePdf({
    payment,
    student,
    invoice: invoiceDraft,
  });

  const invoice = await Invoice.create({
    payment: payment._id,
    student: student._id,
    invoiceNumber,
    pdfPath: filename,
    downloadFilename,
    amount: payment.amount,
    month: payment.month,
    year: payment.year,
    transactionId: payment.transactionId,
    paymentMethod: 'UPI',
    paymentStatus: payment.status === 'approved' ? 'paid' : payment.status,
    paymentDate,
    generatedDate: generatedAt,
    dueDate,
  });

  return { invoice, filepath };
};

export const regenerateInvoicePdf = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;
  const { Payment } = await import('../models/Payment.js');
  const { Student } = await import('../models/Student.js');
  const payment = await Payment.findById(invoice.payment);
  const student = await Student.findById(invoice.student).populate('user');
  if (!payment || !student) return null;
  const result = await generateInvoicePdf({ payment, student, invoice });
  invoice.pdfPath = result.filename;
  if (!invoice.downloadFilename) {
    invoice.downloadFilename = result.downloadFilename;
  }
  await invoice.save();
  return { invoice, ...result };
};
