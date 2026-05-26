import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { normalizeGender, normalizeBloodGroup } from '../utils/studentProfile.js';

const DEFAULT_PASSWORD = 'Student@123';

const HEADER_MAP = {
  fullname: 'fullName',
  name: 'fullName',
  studentname: 'fullName',
  studentid: 'studentId',
  ksa_id: 'studentId',
  ksaid: 'studentId',
  id: 'studentId',
  email: 'email',
  emailaddress: 'email',
  phone: 'phone',
  mobile: 'phone',
  phonenumber: 'phone',
  contact: 'phone',
  password: 'password',
  alternatephone: 'alternatePhone',
  altphone: 'alternatePhone',
  address: 'address',
  dateofbirth: 'dateOfBirth',
  dob: 'dateOfBirth',
  gender: 'gender',
  bloodgroup: 'bloodGroup',
  parentguardianname: 'parentGuardianName',
  parentname: 'parentGuardianName',
  guardian: 'parentGuardianName',
  emergencycontact: 'emergencyContact',
  wbshooterid: 'wbShooterId',
  wb_id: 'wbShooterId',
  wbshooter: 'wbShooterId',
  nraishooterid: 'nraiShooterId',
  nrai_id: 'nraiShooterId',
  nraiid: 'nraiShooterId',
  shootingcategory: 'shootingCategory',
  category: 'shootingCategory',
  preferredweapontype: 'preferredWeaponType',
  weapon: 'preferredWeaponType',
  assignedcoach: 'assignedCoach',
  coach: 'assignedCoach',
  shootingexperience: 'shootingExperience',
  experience: 'shootingExperience',
  competitionlevel: 'competitionLevel',
  level: 'competitionLevel',
  iscustomfeeenabled: 'isCustomFeeEnabled',
  customfee: 'isCustomFeeEnabled',
  custommonthlyfee: 'customMonthlyFee',
  monthlyfee: 'customMonthlyFee',
  fee: 'customMonthlyFee',
  feediscount: 'feeDiscount',
  discount: 'feeDiscount',
  feedueday: 'feeDueDay',
  dueday: 'feeDueDay',
  joiningdate: 'joiningDate',
  joined: 'joiningDate',
  personalbio: 'personalBio',
  bio: 'personalBio',
};

export const BULK_CSV_HEADERS = [
  'fullName',
  'email',
  'phone',
  'studentId',
  'password',
  'alternatePhone',
  'address',
  'dateOfBirth',
  'gender',
  'bloodGroup',
  'parentGuardianName',
  'emergencyContact',
  'wbShooterId',
  'nraiShooterId',
  'shootingCategory',
  'preferredWeaponType',
  'assignedCoach',
  'shootingExperience',
  'competitionLevel',
  'isCustomFeeEnabled',
  'customMonthlyFee',
  'feeDiscount',
  'feeDueDay',
  'joiningDate',
];

export const BULK_CSV_SAMPLE_ROW = {
  fullName: 'Rahul Sharma',
  email: 'rahul.sharma@example.com',
  phone: '9876543210',
  studentId: 'KSA001',
  password: 'Student@123',
  alternatePhone: '',
  address: 'Kalyani, West Bengal',
  dateOfBirth: '2010-05-15',
  gender: 'Male',
  bloodGroup: 'B+',
  parentGuardianName: 'Mr. Sharma',
  emergencyContact: '9876543211',
  wbShooterId: 'WB12345',
  nraiShooterId: 'NRAI67890',
  shootingCategory: 'Air Rifle',
  preferredWeaponType: 'Air Rifle',
  assignedCoach: 'Coach Name',
  shootingExperience: '2 years',
  competitionLevel: 'State',
  isCustomFeeEnabled: 'false',
  customMonthlyFee: '',
  feeDiscount: '0',
  feeDueDay: '5',
  joiningDate: '2024-01-01',
};

const normalizeHeader = (h) =>
  String(h || '')
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, '')
    .replace(/[^a-z0-9_]/g, '');

const parseCsvLine = (line) => {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
};

export const parseCsvBuffer = (buffer) => {
  const text = buffer.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], headers: [] };

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => HEADER_MAP[normalizeHeader(h)] || normalizeHeader(h));

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => !v)) continue;
    const row = {};
    headers.forEach((key, idx) => {
      if (key) row[key] = values[idx] ?? '';
    });
    row._rowNumber = i + 1;
    rows.push(row);
  }
  return { rows, headers };
};

const parseBool = (v) => {
  const s = String(v || '').trim().toLowerCase();
  return ['true', '1', 'yes', 'y'].includes(s);
};

const parseDate = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const buildStudentPayload = (row) => {
  const email = String(row.email || '').trim().toLowerCase();
  const phone = String(row.phone || '').trim();
  const fullName = String(row.fullName || '').trim();
  const studentId = String(row.studentId || '').trim().toUpperCase();

  if (!fullName) throw new Error('fullName is required');
  if (!email || !email.includes('@')) throw new Error('Valid email is required');
  if (!phone) throw new Error('phone is required');
  if (!studentId) throw new Error('studentId is required');

  const isCustomFeeEnabled = parseBool(row.isCustomFeeEnabled);
  const customMonthlyFee =
    row.customMonthlyFee !== '' && row.customMonthlyFee !== undefined
      ? Number(row.customMonthlyFee)
      : undefined;

  return {
    user: {
      email,
      phone,
      password: String(row.password || '').trim() || DEFAULT_PASSWORD,
      role: 'student',
    },
    student: {
      fullName,
      studentId,
      email,
      phone,
      alternatePhone: String(row.alternatePhone || '').trim(),
      address: String(row.address || '').trim(),
      dateOfBirth: parseDate(row.dateOfBirth),
      gender: normalizeGender(row.gender) ?? '',
      bloodGroup: normalizeBloodGroup(row.bloodGroup) ?? '',
      parentGuardianName: String(row.parentGuardianName || '').trim(),
      emergencyContact: String(row.emergencyContact || '').trim(),
      personalBio: String(row.personalBio || '').trim(),
      joiningDate: parseDate(row.joiningDate) || new Date(),
      wbShooterId: String(row.wbShooterId || '').trim().toUpperCase(),
      nraiShooterId: String(row.nraiShooterId || '').trim().toUpperCase(),
      shootingCategory: String(row.shootingCategory || '').trim(),
      preferredWeaponType: String(row.preferredWeaponType || '').trim(),
      assignedCoach: String(row.assignedCoach || '').trim(),
      shootingExperience: String(row.shootingExperience || '').trim(),
      competitionLevel: String(row.competitionLevel || '').trim(),
      isCustomFeeEnabled,
      customMonthlyFee: isCustomFeeEnabled && customMonthlyFee != null && !Number.isNaN(customMonthlyFee)
        ? customMonthlyFee
        : undefined,
      feeDiscount: Number(row.feeDiscount) || 0,
      feeDueDay: Math.min(28, Math.max(1, Number(row.feeDueDay) || 5)),
    },
  };
};

export const importStudentsFromCsv = async (buffer) => {
  const { rows } = parseCsvBuffer(buffer);
  if (!rows.length) {
    return { created: 0, failed: [{ row: 0, reason: 'CSV has no data rows' }], students: [] };
  }

  const created = [];
  const failed = [];
  const seenEmails = new Set();
  const seenStudentIds = new Set();

  for (const row of rows) {
    const rowNum = row._rowNumber;
    try {
      const { user: userData, student: studentData } = buildStudentPayload(row);

      if (seenEmails.has(userData.email)) {
        throw new Error('Duplicate email in CSV');
      }
      if (seenStudentIds.has(studentData.studentId)) {
        throw new Error('Duplicate studentId in CSV');
      }

      const emailExists = await User.findOne({ email: userData.email });
      if (emailExists) throw new Error('Email already registered');

      const idExists = await Student.findOne({ studentId: studentData.studentId });
      if (idExists) throw new Error('Student ID already exists');

      const user = await User.create(userData);
      const student = await Student.create({ ...studentData, user: user._id });

      seenEmails.add(userData.email);
      seenStudentIds.add(studentData.studentId);
      created.push({
        row: rowNum,
        studentId: student.studentId,
        fullName: student.fullName,
        email: user.email,
      });
    } catch (err) {
      failed.push({
        row: rowNum,
        reason: err.message || 'Import failed',
        email: row.email,
        studentId: row.studentId,
      });
    }
  }

  return {
    created: created.length,
    failed,
    students: created,
  };
};

export const buildTemplateCsv = () => {
  const header = BULK_CSV_HEADERS.join(',');
  const row = BULK_CSV_HEADERS.map((h) => {
    const v = BULK_CSV_SAMPLE_ROW[h] ?? '';
    const s = String(v);
    return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',');
  return `${header}\n${row}\n`;
};
