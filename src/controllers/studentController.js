import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { Student } from '../models/Student.js';
import { Payment } from '../models/Payment.js';
import { saveUploadedFile } from '../services/uploadService.js';
import { getPaymentSettings } from '../services/settingsService.js';
import { getEffectiveMonthlyFee, getFeeMeta } from '../services/feeService.js';
import {
  normalizeGender,
  normalizeBloodGroup,
  applyProfileFields,
} from '../utils/studentProfile.js';

const STUDENT_EDITABLE = [
  'phone',
  'alternatePhone',
  'address',
  'emergencyContact',
  'personalBio',
  'gender',
  'bloodGroup',
  'parentGuardianName',
];

const parseBody = (body) => {
  const parsed = { ...body };
  ['isCustomFeeEnabled', 'customMonthlyFee', 'feeDiscount', 'feeDueDay', 'feeAmount'].forEach((k) => {
    if (parsed[k] !== undefined && parsed[k] !== '') {
      if (k === 'isCustomFeeEnabled') parsed[k] = parsed[k] === 'true' || parsed[k] === true;
      else if (k !== 'isCustomFeeEnabled') parsed[k] = Number(parsed[k]);
    }
  });
  if (parsed.dateOfBirth) parsed.dateOfBirth = new Date(parsed.dateOfBirth);
  if (parsed.joiningDate) parsed.joiningDate = new Date(parsed.joiningDate);
  return parsed;
};

const enrichStudent = async (student, user = null) => {
  const s = student.toObject ? student.toObject() : { ...student };
  if (s.gender) s.gender = normalizeGender(s.gender) ?? s.gender;
  if (s.bloodGroup) s.bloodGroup = normalizeBloodGroup(s.bloodGroup) ?? s.bloodGroup;
  const settings = await getPaymentSettings();
  const feeMeta = await getFeeMeta(student);
  const u = user || (await User.findById(student.user).select('email phone isActive lastLogin role'));
  return {
    ...s,
    user: u,
    effectiveFee: feeMeta.amount,
    feeType: feeMeta.feeType,
    globalUPI: settings.globalUPI,
    paymentSettings: settings,
    feeMeta,
  };
};

export const createStudent = asyncHandler(async (req, res) => {
  const body = parseBody(req.body);
  const {
    fullName, email, phone, address, studentId, password, joiningDate,
    isCustomFeeEnabled, customMonthlyFee, feeDiscount, feeDueDay,
    wbShooterId, nraiShooterId, assignedCoach, shootingCategory,
  } = body;

  const exists = await User.findOne({ email: email?.toLowerCase() });
  if (exists) throw new ApiError(400, 'Email already registered');

  const user = await User.create({
    email: email.toLowerCase(),
    phone,
    password: password || 'Student@123',
    role: 'student',
  });

  let photo = '';
  if (req.file) photo = await saveUploadedFile(req.file);

  const student = await Student.create({
    user: user._id,
    fullName,
    studentId,
    email: email?.toLowerCase(),
    phone,
    address: address || '',
    joiningDate,
    photo,
    wbShooterId: wbShooterId || '',
    nraiShooterId: nraiShooterId || '',
    assignedCoach: assignedCoach || '',
    shootingCategory: shootingCategory || '',
    isCustomFeeEnabled: !!isCustomFeeEnabled,
    customMonthlyFee: isCustomFeeEnabled ? customMonthlyFee : undefined,
    feeDiscount: feeDiscount || 0,
    feeDueDay: feeDueDay || 5,
    ...pickStudentFields(body),
  });

  res.status(201).json({ success: true, data: await enrichStudent(student, user) });
});

function pickStudentFields(body) {
  const keys = [
    'alternatePhone', 'dateOfBirth', 'gender', 'bloodGroup', 'parentGuardianName',
    'emergencyContact', 'personalBio', 'preferredWeaponType', 'shootingExperience',
    'competitionLevel', 'wbShooterId', 'nraiShooterId', 'shootingCategory',
    'assignedCoach',
  ];
  const out = {};
  keys.forEach((k) => {
    if (body[k] === undefined) return;
    if (k === 'gender') {
      out.gender = normalizeGender(body.gender);
      return;
    }
    if (k === 'bloodGroup') {
      out.bloodGroup = normalizeBloodGroup(body.bloodGroup);
      return;
    }
    if (k === 'parentGuardianName') {
      out.parentGuardianName = String(body.parentGuardianName || '').trim();
      return;
    }
    if (body[k] !== '') out[k] = body[k];
  });
  return out;
}

export const getStudents = asyncHandler(async (req, res) => {
  const { search, wbShooterId, nraiShooterId } = req.query;
  const filter = {};

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { fullName: regex },
      { studentId: regex },
      { phone: regex },
      { wbShooterId: regex },
      { nraiShooterId: regex },
      { email: regex },
    ];
  }
  if (wbShooterId) filter.wbShooterId = new RegExp(wbShooterId, 'i');
  if (nraiShooterId) filter.nraiShooterId = new RegExp(nraiShooterId, 'i');

  const students = await Student.find(filter)
    .populate('user', 'email phone isActive lastLogin')
    .sort('-createdAt');

  const data = await Promise.all(students.map((s) => enrichStudent(s, s.user)));
  res.json({ success: true, data });
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate('user', 'email phone isActive lastLogin');
  if (!student) throw new ApiError(404, 'Student not found');

  const payments = await Payment.find({ student: student._id }).sort('-createdAt').limit(20);
  const data = await enrichStudent(student);
  res.json({ success: true, data: { ...data, payments } });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  const body = parseBody(req.body);
  const updateData = {};

  const adminFields = [
    'fullName', 'phone', 'alternatePhone', 'address', 'joiningDate', 'dateOfBirth',
    'gender', 'bloodGroup', 'parentGuardianName', 'emergencyContact', 'personalBio',
    'wbShooterId', 'nraiShooterId', 'shootingCategory', 'preferredWeaponType',
    'assignedCoach', 'shootingExperience', 'competitionLevel',
    'isCustomFeeEnabled', 'customMonthlyFee', 'feeDiscount', 'feeDueDay', 'feeAmount',
    'studentId',
  ];

  adminFields.forEach((f) => {
    if (body[f] !== undefined) updateData[f] = body[f];
  });

  applyProfileFields(updateData, body, ['gender', 'bloodGroup', 'parentGuardianName']);

  if (body.isCustomFeeEnabled === false) {
    updateData.isCustomFeeEnabled = false;
    updateData.customMonthlyFee = undefined;
  }

  if (req.file) updateData.photo = await saveUploadedFile(req.file);

  if (body.email) {
    await User.findByIdAndUpdate(student.user, {
      email: body.email.toLowerCase(),
      phone: body.phone || student.phone,
    });
    updateData.email = body.email.toLowerCase();
  }

  if (body.isActive !== undefined) {
    await User.findByIdAndUpdate(student.user, { isActive: body.isActive === true || body.isActive === 'true' });
  }

  const updated = await Student.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate('user', 'email phone isActive lastLogin');

  res.json({ success: true, data: await enrichStudent(updated), message: 'Profile updated successfully' });
});

export const suspendStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  const isActive = req.body.isActive !== false && req.body.isActive !== 'false';
  await User.findByIdAndUpdate(student.user, { isActive });
  res.json({ success: true, message: isActive ? 'Student activated' : 'Student suspended', isActive });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  await User.findByIdAndDelete(student.user);
  await Student.findByIdAndDelete(student._id);
  res.json({ success: true, message: 'Student deleted' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  const user = await User.findById(student.user);
  user.password = req.body.password || 'Student@123';
  await user.save();
  res.json({ success: true, message: 'Password reset successfully' });
});

export const uploadDocuments = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');

  const files = req.files || [];
  for (let i = 0; i < files.length; i++) {
    const fileUrl = await saveUploadedFile(files[i]);
    student.documents.push({
      name: req.body[`docName_${i}`] || files[i].originalname,
      type: req.body[`docType_${i}`] || 'document',
      file: fileUrl,
    });
  }
  await student.save();
  res.json({ success: true, data: await enrichStudent(student) });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  const doc = student.documents.id(req.params.docId);
  if (!doc) throw new ApiError(404, 'Document not found');
  doc.deleteOne();
  await student.save();
  res.json({ success: true, data: await enrichStudent(student) });
});

export const getProfile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id }).populate('user', 'email phone isActive lastLogin');
  if (!student) throw new ApiError(404, 'Student profile not found');

  const payments = await Payment.find({ student: student._id }).sort('-createdAt').limit(12);
  const data = await enrichStudent(student);
  res.json({ success: true, data: { ...data, payments, permissions: getStudentPermissions() } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id });
  if (!student) throw new ApiError(404, 'Student profile not found');

  const body = req.body;
  const forbidden = [
    'feeAmount', 'customMonthlyFee', 'isCustomFeeEnabled', 'feeDiscount', 'feeDueDay',
    'wbShooterId', 'nraiShooterId', 'assignedCoach', 'upiId', 'studentId', 'isActive',
    'fullName', 'email',
  ];
  forbidden.forEach((f) => {
    if (body[f] !== undefined) throw new ApiError(403, `You cannot modify: ${f}`);
  });

  const updateData = {};
  applyProfileFields(updateData, body, STUDENT_EDITABLE);

  if (req.file) updateData.photo = await saveUploadedFile(req.file);

  const updated = await Student.findByIdAndUpdate(student._id, updateData, {
    new: true,
    runValidators: true,
  });

  if (body.phone) {
    await User.findByIdAndUpdate(req.user._id, { phone: body.phone });
  }

  const populated = await Student.findById(updated._id).populate('user', 'email phone isActive lastLogin');
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: await enrichStudent(populated),
  });
});

function getStudentPermissions() {
  return {
    editable: STUDENT_EDITABLE.concat(['photo', 'password']),
    profileFields: ['gender', 'bloodGroup', 'parentGuardianName'],
    locked: [
      'wbShooterId', 'nraiShooterId', 'assignedCoach', 'effectiveFee', 'globalUPI',
      'isCustomFeeEnabled', 'feeDiscount', 'accountStatus',
    ],
  };
}

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalStudents, pendingPayments, approvedPayments, recentPayments] = await Promise.all([
    Student.countDocuments(),
    Payment.countDocuments({ status: 'pending' }),
    Payment.countDocuments({ status: 'approved' }),
    Payment.find()
      .populate({ path: 'student', select: 'fullName studentId wbShooterId nraiShooterId' })
      .sort('-createdAt')
      .limit(5)
      .lean(),
  ]);

  res.json({
    success: true,
    data: { totalStudents, pendingPayments, approvedPayments, recentPayments },
  });
});

export const getStudentDashboard = asyncHandler(async (req, res) => {
  const student = req.student;
  const feeMeta = await getFeeMeta(student);

  const pendingPayment = await Payment.findOne({
    student: student._id,
    status: 'pending',
  }).sort('-createdAt');

  const approvedCount = await Payment.countDocuments({
    student: student._id,
    status: 'approved',
  });

  const feeHistory = await Payment.find({ student: student._id }).sort('-createdAt').limit(6);

  res.json({
    success: true,
    data: {
      student: await enrichStudent(student),
      pendingPayment,
      approvedPayments: approvedCount,
      feeHistory,
      ...feeMeta,
    },
  });
});
