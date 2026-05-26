import { Student } from '../models/Student.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { ScoreSession } from '../models/ScoreSession.js';
import { Diary } from '../models/Diary.js';
import { AuditLog } from '../models/AuditLog.js';
import { getPaymentSettings } from './settingsService.js';
import { getEffectiveMonthlyFee, getGlobalDefaultFee } from './feeService.js';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const getCurrentPeriod = () => {
  const now = new Date();
  return { month: MONTHS[now.getMonth()], year: now.getFullYear(), now };
};

const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const monthEnd = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

let statsCache = { data: null, at: 0 };
const CACHE_MS = 45 * 1000;

export const getDashboardStats = async ({ useCache = true } = {}) => {
  if (useCache && statsCache.data && Date.now() - statsCache.at < CACHE_MS) {
    return statsCache.data;
  }

  const { month, year, now } = getCurrentPeriod();
  const settings = await getPaymentSettings();
  const defaultFee = getGlobalDefaultFee(settings);

  const thisMonthStart = monthStart(now);
  const lastMonthStart = monthStart(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = monthEnd(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const [
    totalStudents,
    activeStudents,
    inactiveStudents,
    pendingPayments,
    approvedPayments,
    rejectedPayments,
    monthlyCollectionAgg,
    lastMonthCollectionAgg,
    pendingAmountAgg,
    studentsThisMonth,
    studentsLastMonth,
    overdueStudents,
  ] = await Promise.all([
    Student.countDocuments(),
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'student', isActive: false }),
    Payment.countDocuments({ status: 'pending' }),
    Payment.countDocuments({ status: 'approved' }),
    Payment.countDocuments({ status: 'rejected' }),
    Payment.aggregate([
      { $match: { status: 'approved', month, year } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      {
        $match: {
          status: 'approved',
          approvedAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Student.countDocuments({ createdAt: { $gte: thisMonthStart } }),
    Student.countDocuments({ createdAt: { $gte: lastMonthStart, $lt: thisMonthStart } }),
    Payment.distinct('student', { status: 'pending' }),
  ]);

  const monthlyCollection = monthlyCollectionAgg[0]?.total || 0;
  const lastMonthCollection = lastMonthCollectionAgg[0]?.total || 0;
  const pendingAmount = pendingAmountAgg[0]?.total || 0;

  const approvedThisMonth = await Payment.distinct('student', { month, year, status: 'approved' });
  const activeStudentDocs = await Student.find()
    .populate({ path: 'user', select: 'isActive' })
    .lean();

  let outstandingFees = pendingAmount;
  let overdueCount = 0;
  const activeList = activeStudentDocs.filter((s) => s.user?.isActive !== false);

  for (const s of activeList) {
    const sid = String(s._id);
    if (!approvedThisMonth.some((id) => String(id) === sid)) {
      overdueCount += 1;
      outstandingFees += getEffectiveMonthlyFee(s, settings);
    }
  }

  const collectionGrowth =
    lastMonthCollection > 0
      ? Number((((monthlyCollection - lastMonthCollection) / lastMonthCollection) * 100).toFixed(1))
      : monthlyCollection > 0
        ? 100
        : 0;

  const studentGrowth =
    studentsLastMonth > 0
      ? Number((((studentsThisMonth - studentsLastMonth) / studentsLastMonth) * 100).toFixed(1))
      : studentsThisMonth > 0
        ? 100
        : 0;

  const data = {
    totalStudents,
    activeStudents,
    inactiveStudents,
    pendingPayments,
    approvedPayments,
    rejectedPayments,
    monthlyCollection,
    lastMonthCollection,
    collectionGrowth,
    outstandingFees,
    pendingAmount,
    overdueCount,
    overdueStudents: overdueStudents.length,
    studentsThisMonth,
    studentGrowth,
    defaultMonthlyFee: defaultFee,
    currentMonth: month,
    currentYear: year,
  };

  statsCache = { data, at: Date.now() };
  return data;
};

export const getDashboardRevenue = async () => {
  const { now } = getCurrentPeriod();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [monthlyRevenue, paymentStatus, dailyActivity, studentGrowth, feeTrend, sessionActivity] =
    await Promise.all([
      Payment.aggregate([
        { $match: { status: 'approved' } },
        {
          $group: {
            _id: { month: '$month', year: '$year' },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 },
      ]),
      Payment.aggregate([
        { $group: { _id: '$status', value: { $sum: 1 }, amount: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
      Student.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Payment.aggregate([
        { $match: { status: 'approved', approvedAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$approvedAt' } },
            collected: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ScoreSession.aggregate([
        { $match: { sessionDate: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$sessionDate' } },
            sessions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

  const monthOrder = MONTHS.reduce((acc, m, i) => ({ ...acc, [m]: i }), {});
  const monthlyRevenueChart = monthlyRevenue
    .map((r) => ({
      label: `${r._id.month?.slice(0, 3) || ''} ${r._id.year}`,
      month: r._id.month,
      year: r._id.year,
      revenue: r.revenue,
      count: r.count,
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return (monthOrder[a.month] ?? 0) - (monthOrder[b.month] ?? 0);
    })
    .slice(-8);

  const statusMap = { approved: 0, pending: 0, rejected: 0 };
  paymentStatus.forEach((p) => {
    statusMap[p._id] = p.value;
  });
  const { month, year } = getCurrentPeriod();
  const overdueEstimate = statusMap.pending || 0;

  const pieData = [
    { name: 'Approved', value: statusMap.approved || 0, color: '#2e7d32' },
    { name: 'Pending', value: statusMap.pending || 0, color: '#ed6c02' },
    { name: 'Rejected', value: statusMap.rejected || 0, color: '#d32f2f' },
    { name: 'Overdue', value: overdueEstimate, color: '#9c27b0' },
  ].filter((d) => d.value > 0);

  const studentGrowthChart = studentGrowth.map((g) => ({
    label: `${MONTHS[g._id.month - 1]?.slice(0, 3)} ${g._id.year}`,
    students: g.count,
  }));

  return {
    monthlyRevenue: monthlyRevenueChart,
    paymentStatus: pieData,
    dailyActivity: dailyActivity.map((d) => ({
      date: d._id,
      submissions: d.total,
      approved: d.approved,
      pending: d.pending,
      amount: d.amount,
    })),
    studentGrowth: studentGrowthChart,
    feeCollectionTrend: feeTrend.map((f) => ({ month: f._id, collected: f.collected })),
    sessionActivity: sessionActivity.map((s) => ({ month: s._id, sessions: s.sessions })),
    currentPeriod: { month, year },
  };
};

export const getDashboardPayments = async ({
  page = 1,
  limit = 10,
  status = '',
  search = '',
}) => {
  const filter = {};
  if (status) filter.status = status;

  let studentIds = null;
  if (search.trim()) {
    const q = search.trim();
    const students = await Student.find({
      $or: [
        { fullName: new RegExp(q, 'i') },
        { studentId: new RegExp(q, 'i') },
      ],
    }).select('_id');
    studentIds = students.map((s) => s._id);
    filter.student = { $in: studentIds };
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [payments, total, pendingQuick] = await Promise.all([
    Payment.find(filter)
      .populate({ path: 'student', select: 'fullName studentId photo wbShooterId' })
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(filter),
    Payment.find({ status: 'pending' })
      .populate({ path: 'student', select: 'fullName studentId photo' })
      .sort('-createdAt')
      .limit(6)
      .lean(),
  ]);

  const rows = payments.map((p) => ({
    _id: p._id,
    studentName: p.student?.fullName || '—',
    studentId: p.student?.studentId || '—',
    ksaId: p.student?.studentId || '—',
    photo: p.student?.photo || '',
    amount: p.amount,
    status: p.status,
    month: p.month,
    year: p.year,
    period: `${p.month} ${p.year}`,
    transactionId: p.transactionId,
    proofImage: p.proofImage,
    paymentDate: p.approvedAt || p.createdAt,
    createdAt: p.createdAt,
  }));

  return {
    payments: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    pendingApprovals: pendingQuick.map((p) => ({
      _id: p._id,
      studentName: p.student?.fullName,
      studentId: p.student?.studentId,
      photo: p.student?.photo,
      amount: p.amount,
      transactionId: p.transactionId,
      proofImage: p.proofImage,
      createdAt: p.createdAt,
      period: `${p.month} ${p.year}`,
    })),
  };
};

export const getTopShooters = async (limit = 5) => {
  const rows = await ScoreSession.aggregate([
    { $unwind: '$series' },
    { $unwind: '$series.shots' },
    {
      $group: {
        _id: '$student',
        avgScore: { $avg: '$series.shots.value' },
        shots: { $sum: 1 },
        sessions: { $addToSet: '$_id' },
      },
    },
    { $addFields: { sessionCount: { $size: '$sessions' } } },
    { $match: { shots: { $gte: 5 } } },
    { $sort: { avgScore: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
  ]);

  return rows.map((r, index) => ({
    rank: index + 1,
    studentId: r.student?.studentId || '—',
    fullName: r.student?.fullName || 'Unknown',
    photo: r.student?.photo || '',
    averageScore: Number(r.avgScore?.toFixed(2) || 0),
    totalShots: r.shots,
    sessions: r.sessionCount,
  }));
};

export const getDashboardActivities = async (limit = 15) => {
  const [audits, recentPayments, recentStudents, diaryCount, sessionCount] = await Promise.all([
    AuditLog.find()
      .sort('-createdAt')
      .limit(limit)
      .populate({ path: 'adminId', select: 'email' })
      .lean(),
    Payment.find()
      .sort('-createdAt')
      .limit(8)
      .populate({ path: 'student', select: 'fullName studentId' })
      .lean(),
    Student.find().sort('-createdAt').limit(5).select('fullName studentId createdAt').lean(),
    Diary.countDocuments({ createdAt: { $gte: monthStart(new Date()) } }),
    ScoreSession.countDocuments({ sessionDate: { $gte: monthStart(new Date()) } }),
  ]);

  const auditItems = audits.map((a) => ({
    id: `audit-${a._id}`,
    type: a.action,
    title: formatAuditTitle(a),
    subtitle: a.resource ? `${a.resource} ${a.resourceId || ''}`.trim() : '',
    timestamp: a.createdAt,
    category: 'admin',
  }));

  const paymentItems = recentPayments.map((p) => ({
    id: `pay-${p._id}`,
    type: `payment_${p.status}`,
    title: `${p.student?.fullName || 'Student'} — ${p.status}`,
    subtitle: `₹${p.amount} · ${p.month} ${p.year}`,
    timestamp: p.createdAt,
    category: 'payment',
  }));

  const studentItems = recentStudents.map((s) => ({
    id: `stu-${s._id}`,
    type: 'student_added',
    title: `New student: ${s.fullName}`,
    subtitle: s.studentId,
    timestamp: s.createdAt,
    category: 'student',
  }));

  const combined = [...auditItems, ...paymentItems, ...studentItems]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);

  return {
    activities: combined,
    engagement: { diariesThisMonth: diaryCount, sessionsThisMonth: sessionCount },
  };
};

const formatAuditTitle = (a) => {
  const map = {
    payment_approve: 'Payment approved',
    payment_reject: 'Payment rejected',
    student_update: 'Student profile updated',
  };
  return map[a.action] || a.action.replace(/_/g, ' ');
};

export const getDashboardNotifications = async () => {
  const stats = await getDashboardStats({ useCache: true });
  const notifications = [];

  if (stats.pendingPayments > 0) {
    notifications.push({
      id: 'pending-payments',
      type: 'warning',
      title: `${stats.pendingPayments} pending payment(s)`,
      message: `₹${stats.pendingAmount} awaiting approval`,
      link: '/payments',
    });
  }
  if (stats.overdueCount > 0) {
    notifications.push({
      id: 'overdue-fees',
      type: 'error',
      title: `${stats.overdueCount} student(s) overdue`,
      message: 'No approved fee for current month',
      link: '/payments',
    });
  }
  if (stats.studentsThisMonth > 0) {
    notifications.push({
      id: 'new-students',
      type: 'info',
      title: `${stats.studentsThisMonth} new student(s) this month`,
      message: `+${stats.studentGrowth}% growth`,
      link: '/students',
    });
  }
  if (stats.rejectedPayments > 0) {
    notifications.push({
      id: 'rejected',
      type: 'error',
      title: `${stats.rejectedPayments} rejected payment(s)`,
      message: 'Review and follow up',
      link: '/payments',
    });
  }

  return notifications;
};

export const clearDashboardCache = () => {
  statsCache = { data: null, at: 0 };
};
