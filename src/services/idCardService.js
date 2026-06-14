import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../../', env.uploadPath);
const fontRegularPath = path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
const fontBoldPath = path.join(__dirname, '../../assets/fonts/NotoSans-Bold.ttf');

const PDF_FONT = 'KSA-NotoSans';
const PDF_FONT_BOLD = 'KSA-NotoSans-Bold';

const BRAND = {
  primary: '#FFD600',
  black: '#111111',
  muted: '#6B6B6B',
  light: '#F4F4F2',
  white: '#FFFFFF',
};

const SIGNATORY = 'DIGANTA CHATTOPADHYAY';
const ACADEMY = 'Kalyani Shooting Academy';

const CONTACT = {
  phone: '+91 70037 17476',
  address: 'Block A, Kalyani, West Bengal, India',
  email: 'kalyanishooting@gmail.com',
};

/** CR80: 85.6 mm × 54 mm — single page only */
const MM = 72 / 25.4;
const CARD_W = 85.6 * MM;
const CARD_H = 54 * MM;
const HEADER_H = 26;
const FOOTER_H = 26;
const PAD = 8;
const GAP = 6;

const PHOTO_W = 38;
const PHOTO_H = 40;
const QR_SIZE = 36;

const LABEL_COL_W = 77;
const PRIMARY_FONT = 7;
const PRIMARY_ROW_H = 9.6;
const ID_FONT = 6.5;
const ID_ROW_H = 8.4;
const ID_LABEL_W = 46;

function formatDob(dob) {
  if (!dob) return '—';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function upper(value) {
  return String(value || '—').trim().toUpperCase() || '—';
}

function buildQrPayload(student) {
  const name = upper(student.fullName);
  const ksaId = upper(student.studentId);
  const dob = formatDob(student.dateOfBirth);
  return `Athlete Name: ${name}\nKSA ID: ${ksaId}\nDOB: ${dob}`;
}

async function createQrBuffer(student) {
  try {
    return await QRCode.toBuffer(buildQrPayload(student), {
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 160,
      type: 'png',
    });
  } catch {
    return null;
  }
}

function registerFonts(doc) {
  if (fs.existsSync(fontRegularPath)) {
    doc.registerFont(PDF_FONT, fontRegularPath);
    doc.registerFont(PDF_FONT_BOLD, fs.existsSync(fontBoldPath) ? fontBoldPath : fontRegularPath);
    return { regular: PDF_FONT, bold: PDF_FONT_BOLD };
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

function resolveLogoPath() {
  const candidates = [
    path.join(__dirname, '../../assets/ksalogo.png'),
    path.join(__dirname, '../../../frontend/public/ksalogo.png'),
    path.join(__dirname, '../../../admin-panel/public/ksalogo.png'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function resolvePhotoPath(photo) {
  if (!photo || photo.startsWith('http')) return null;
  const local = path.join(uploadDir, path.basename(photo));
  return fs.existsSync(local) ? local : null;
}

function shooterTypeLabel(student) {
  return (
    student.shootingCategory?.trim() ||
    student.preferredWeaponType?.trim() ||
    student.competitionLevel?.trim() ||
    'Academy Shooter'
  );
}

function drawHeader(doc, logoPath, fonts) {
  doc.rect(0, 0, CARD_W, HEADER_H).fill(BRAND.black);

  if (logoPath) {
    try {
      doc.image(logoPath, CARD_W - 52, 1, { width: 48, height: 24, fit: [48, 24], align: 'center', valign: 'center' });
    } catch {
      /* skip logo */
    }
  }

  const titleX = PAD;
  doc
    .font(fonts.bold)
    .fontSize(7.5)
    .fillColor(BRAND.white)
    .text('KALYANI SHOOTING ACADEMY', titleX, 7, { width: CARD_W - titleX - 56, lineBreak: false });

  doc
    .font(fonts.regular)
    .fontSize(5)
    .fillColor(BRAND.primary)
    .text('Member Identity Card', titleX, 15, { width: CARD_W - titleX - 56, lineBreak: false });

  doc.rect(0, HEADER_H, CARD_W, 2).fill(BRAND.primary);
}

function drawPrimaryRow(doc, x, y, w, label, value, fonts) {
  doc
    .font(fonts.bold)
    .fontSize(PRIMARY_FONT)
    .fillColor(BRAND.black)
    .text(`${label} :`, x, y, { width: LABEL_COL_W, lineBreak: false });

  doc
    .font(fonts.bold)
    .fontSize(PRIMARY_FONT)
    .fillColor(BRAND.black)
    .text(upper(value), x + LABEL_COL_W + 2, y, { width: w - LABEL_COL_W - 2, lineBreak: false });

  return y + PRIMARY_ROW_H;
}

function drawIdRow(doc, x, y, w, label, value, fonts) {
  const labelText = `${label} :`;
  doc.font(fonts.regular).fontSize(ID_FONT).fillColor(BRAND.muted).text(labelText, x, y, { width: ID_LABEL_W, lineBreak: false });
  doc
    .font(fonts.bold)
    .fontSize(ID_FONT)
    .fillColor(BRAND.black)
    .text(String(value).toUpperCase(), x + ID_LABEL_W + 2, y, { width: w - ID_LABEL_W - 2, lineBreak: false });
  return y + ID_ROW_H;
}

function drawPhoto(doc, x, y, photoPath) {
  doc.roundedRect(x, y, PHOTO_W, PHOTO_H, 3).lineWidth(1).strokeColor(BRAND.primary).stroke();

  if (photoPath) {
    try {
      doc.image(photoPath, x + 1.5, y + 1.5, {
        fit: [PHOTO_W - 3, PHOTO_H - 3],
        align: 'center',
        valign: 'center',
      });
      return;
    } catch {
      /* fall through to placeholder */
    }
  }

  doc.roundedRect(x + 1.5, y + 1.5, PHOTO_W - 3, PHOTO_H - 3, 2).fill(BRAND.light);
}

function drawQrCode(doc, qrBuffer, x, y) {
  if (!qrBuffer) return;
  try {
    doc.image(qrBuffer, x, y, { width: QR_SIZE, height: QR_SIZE });
  } catch {
    /* skip qr */
  }
}

function drawSignature(doc, x, y, w, fonts) {
  doc
    .moveTo(x, y)
    .lineTo(x + w, y)
    .lineWidth(0.5)
    .strokeColor('#CCCCCC')
    .stroke();

  doc
    .font('Times-Italic')
    .fontSize(6.5)
    .fillColor(BRAND.black)
    .text(SIGNATORY, x, y + 2, { width: w, lineBreak: false });

  doc
    .font(fonts.regular)
    .fontSize(4)
    .fillColor(BRAND.muted)
    .text('e-signed · Competent Authority', x, y + 10, { width: w, lineBreak: false });
}

function drawContactBlock(doc, x, y, w, fonts) {
  const lines = [
    `Phone: ${CONTACT.phone}`,
    CONTACT.address,
    `Email: ${CONTACT.email}`,
  ];

  let ly = y;
  doc.font(fonts.regular).fontSize(3.8).fillColor(BRAND.muted);
  for (const line of lines) {
    doc.text(line, x, ly, { width: w, lineBreak: false });
    ly += 5.2;
  }
}

export const buildIdCardFilename = (student) => {
  const id = student.studentId || 'student';
  const safeName = String(student.fullName || 'member')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `KSA-ID-${id}-${safeName}.pdf`;
};

export const generateStudentIdCardPdf = async (student) => {
  const qrBuffer = await createQrBuffer(student);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [CARD_W, CARD_H],
      margin: 0,
      autoFirstPage: true,
      info: { Title: `KSA ID — ${student.fullName}`, Author: ACADEMY },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const fonts = registerFonts(doc);
    const logoPath = resolveLogoPath();
    const photoPath = resolvePhotoPath(student.photo);

    doc.rect(0, 0, CARD_W, CARD_H).fill(BRAND.white);
    drawHeader(doc, logoPath, fonts);

    const bodyTop = HEADER_H + 4;
    const rightX = CARD_W - PAD - PHOTO_W;
    const infoX = PAD;
    const infoW = rightX - infoX - GAP;

    const photoY = bodyTop;
    drawPhoto(doc, rightX, photoY, photoPath);

    const qrX = rightX + (PHOTO_W - QR_SIZE) / 2;
    const qrY = photoY + PHOTO_H + 4;
    drawQrCode(doc, qrBuffer, qrX, qrY);

    let cursorY = bodyTop + 1;
    const detailRows = [
      ["ATHLETE'S NAME", student.fullName],
      ['GUARDIAN NAME', student.parentGuardianName],
      ['DATE OF BIRTH', formatDob(student.dateOfBirth)],
      ['TYPE OF SHOOTER', shooterTypeLabel(student)],
    ];

    for (const [label, value] of detailRows) {
      cursorY = drawPrimaryRow(doc, infoX, cursorY, infoW, label, value, fonts);
    }

    cursorY += 2;
    const idRows = [
      ['KSA ID', student.studentId],
      ['WBRA ID', student.wbShooterId],
      ['NRAI ID', student.nraiShooterId],
    ].filter(([, value]) => value);

    for (const [label, value] of idRows) {
      cursorY = drawIdRow(doc, infoX, cursorY, infoW, label, value, fonts);
    }

    const footerLineY = CARD_H - FOOTER_H;
    doc
      .moveTo(PAD, footerLineY)
      .lineTo(CARD_W - PAD, footerLineY)
      .lineWidth(0.4)
      .strokeColor('#E0E0E0')
      .stroke();

    const sigW = CARD_W * 0.48;
    const contactX = PAD + sigW + 6;
    const contactW = CARD_W - contactX - PAD;

    drawSignature(doc, PAD, footerLineY + 3, sigW, fonts);
    drawContactBlock(doc, contactX, footerLineY + 3, contactW, fonts);

    doc.end();
  });
};
