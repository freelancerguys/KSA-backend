import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ScoreSession } from '../models/ScoreSession.js';

const MAX_SHOT = 10.9;
const MAX_SHOTS_PER_SERIES = 10;

const validateSeries = (series) => {
  if (!Array.isArray(series)) return;
  for (const s of series) {
    const shots = s.shots || [];
    if (shots.length > MAX_SHOTS_PER_SERIES) {
      throw new ApiError(400, `Each series allows at most ${MAX_SHOTS_PER_SERIES} shots`);
    }
    for (const shot of shots) {
      const v = Number(shot.value);
      if (Number.isNaN(v) || v < 0 || v > MAX_SHOT) {
        throw new ApiError(400, `Each shot score must be between 0 and ${MAX_SHOT}`);
      }
    }
  }
};

const calcStats = (sessions) => {
  const allShots = [];
  sessions.forEach((s) => {
    s.series.forEach((series) => {
      series.shots.forEach((shot) => allShots.push(shot.value));
    });
  });
  if (!allShots.length) {
    return { totalShots: 0, average: 0, best: 0, sessions: sessions.length };
  }
  const sum = allShots.reduce((a, b) => a + b, 0);
  return {
    totalShots: allShots.length,
    average: Number((sum / allShots.length).toFixed(2)),
    best: Math.max(...allShots),
    sessions: sessions.length,
  };
};

export const getSessions = asyncHandler(async (req, res) => {
  const filter = { student: req.student._id };
  if (req.query.from || req.query.to) {
    filter.sessionDate = {};
    if (req.query.from) filter.sessionDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.sessionDate.$lte = new Date(req.query.to);
  }
  const sessions = await ScoreSession.find(filter).sort('-sessionDate');
  const stats = calcStats(sessions);
  res.json({ success: true, data: { sessions, stats } });
});

export const createSession = asyncHandler(async (req, res) => {
  validateSeries(req.body.series);
  const session = await ScoreSession.create({
    student: req.student._id,
    sessionDate: req.body.sessionDate || new Date(),
    notes: req.body.notes || '',
    series: req.body.series || [],
  });
  res.status(201).json({ success: true, data: session });
});

export const updateSession = asyncHandler(async (req, res) => {
  const session = await ScoreSession.findOne({
    _id: req.params.id,
    student: req.student._id,
  });
  if (!session) throw new ApiError(404, 'Session not found');
  if (req.body.series) {
    validateSeries(req.body.series);
    session.series = req.body.series;
  }
  if (req.body.notes !== undefined) session.notes = req.body.notes;
  if (req.body.sessionDate) session.sessionDate = req.body.sessionDate;
  await session.save();
  res.json({ success: true, data: session });
});

export const deleteSession = asyncHandler(async (req, res) => {
  const session = await ScoreSession.findOneAndDelete({
    _id: req.params.id,
    student: req.student._id,
  });
  if (!session) throw new ApiError(404, 'Session not found');
  res.json({ success: true, message: 'Deleted' });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const sessions = await ScoreSession.find({ student: req.student._id }).sort('sessionDate');
  const weekly = [];
  const monthly = [];

  sessions.forEach((session) => {
    const shots = session.series.flatMap((s) => s.shots.map((sh) => sh.value));
    if (!shots.length) return;
    const avg = shots.reduce((a, b) => a + b, 0) / shots.length;
    const week = session.sessionDate.toISOString().slice(0, 10);
    const month = `${session.sessionDate.getFullYear()}-${String(session.sessionDate.getMonth() + 1).padStart(2, '0')}`;
    weekly.push({ date: week, average: Number(avg.toFixed(2)), shots: shots.length });
    const existing = monthly.find((m) => m.month === month);
    if (existing) {
      existing.shots += shots.length;
      existing.total += avg * shots.length;
    } else {
      monthly.push({ month, shots: shots.length, total: avg * shots.length });
    }
  });

  const monthlyData = monthly.map((m) => ({
    month: m.month,
    average: Number((m.total / m.shots).toFixed(2)),
    shots: m.shots,
  }));

  res.json({
    success: true,
    data: { weekly, monthly: monthlyData, stats: calcStats(sessions) },
  });
});
