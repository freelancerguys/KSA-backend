import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Student } from '../models/Student.js';
import { ScoreSession } from '../models/ScoreSession.js';
import { calcStats, buildScoreAnalytics } from '../utils/scoreStats.js';

export const listStudentsWithScores = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const studentFilter = search
    ? {
        $or: [
          { fullName: new RegExp(search, 'i') },
          { studentId: new RegExp(search, 'i') },
        ],
      }
    : {};

  const students = await Student.find(studentFilter)
    .populate({ path: 'user', select: 'isActive email' })
    .sort('fullName')
    .lean();

  if (!students.length) {
    return res.json({ success: true, data: [] });
  }

  const studentIds = students.map((s) => s._id);

  const [sessionMeta, shotStats] = await Promise.all([
    ScoreSession.aggregate([
      { $match: { student: { $in: studentIds } } },
      {
        $group: {
          _id: '$student',
          sessionCount: { $sum: 1 },
          lastSessionDate: { $max: '$sessionDate' },
        },
      },
    ]),
    ScoreSession.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $unwind: '$series' },
      { $unwind: '$series.shots' },
      {
        $group: {
          _id: '$student',
          average: { $avg: '$series.shots.value' },
          best: { $max: '$series.shots.value' },
          totalShots: { $sum: 1 },
        },
      },
    ]),
  ]);

  const metaMap = Object.fromEntries(sessionMeta.map((m) => [String(m._id), m]));
  const statsMap = Object.fromEntries(shotStats.map((s) => [String(s._id), s]));

  const rows = students.map((s) => {
    const id = String(s._id);
    const meta = metaMap[id];
    const st = statsMap[id];
    return {
      _id: s._id,
      fullName: s.fullName,
      studentId: s.studentId,
      photo: s.photo,
      wbShooterId: s.wbShooterId,
      nraiShooterId: s.nraiShooterId,
      isActive: s.user?.isActive !== false,
      email: s.user?.email,
      sessions: meta?.sessionCount || 0,
      lastSessionDate: meta?.lastSessionDate || null,
      totalShots: st?.totalShots || 0,
      average: st?.average ? Number(st.average.toFixed(2)) : 0,
      best: st?.best ? Number(st.best.toFixed(2)) : 0,
    };
  });

  res.json({ success: true, data: rows });
});

export const getStudentScores = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.studentId)
    .populate({ path: 'user', select: 'email phone isActive' })
    .lean();

  if (!student) throw new ApiError(404, 'Student not found');

  const sessions = await ScoreSession.find({ student: student._id }).sort('-sessionDate').lean();
  const stats = calcStats(sessions);
  const analytics = buildScoreAnalytics(
    sessions.map((s) => ({ ...s, sessionDate: new Date(s.sessionDate) }))
  );

  res.json({
    success: true,
    data: {
      student: {
        _id: student._id,
        fullName: student.fullName,
        studentId: student.studentId,
        photo: student.photo,
        wbShooterId: student.wbShooterId,
        nraiShooterId: student.nraiShooterId,
        email: student.user?.email,
        phone: student.user?.phone,
        isActive: student.user?.isActive !== false,
      },
      sessions,
      stats,
      analytics: {
        weekly: analytics.weekly,
        monthly: analytics.monthly,
      },
    },
  });
});
