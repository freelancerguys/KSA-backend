export const calcStats = (sessions) => {
  const allShots = [];
  sessions.forEach((s) => {
    (s.series || []).forEach((series) => {
      (series.shots || []).forEach((shot) => allShots.push(shot.value));
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

export const buildScoreAnalytics = (sessions) => {
  const weekly = [];
  const monthly = [];

  sessions.forEach((session) => {
    const shots = (session.series || []).flatMap((s) => (s.shots || []).map((sh) => sh.value));
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

  return { weekly, monthly: monthlyData, stats: calcStats(sessions) };
};
