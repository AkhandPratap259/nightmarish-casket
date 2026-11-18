// Pure fitness math shared by routes and the seed. Nothing here touches the
// database, so it is easy to reason about and test in isolation.

// Epley formula: estimated one-rep max from a sub-maximal set.
function epleyOneRepMax(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

function setVolume(set) {
  return (Number(set.reps) || 0) * (Number(set.weight) || 0);
}

function sessionVolume(session) {
  let total = 0;
  for (const ex of session.exercises || []) {
    for (const set of ex.sets || []) {
      if (set.completed !== false) total += setVolume(set);
    }
  }
  return Math.round(total * 10) / 10;
}

// Progressive-overload suggestion: last best weight plus ~2.5%, rounded to
// the nearest 2.5 kg plate, with a minimum step of 2.5 kg. Returns 0 when
// there is no recorded best yet (bodyweight / first attempt).
function suggestNextWeight(bestWeight) {
  const best = Number(bestWeight) || 0;
  if (best <= 0) return 0;
  const target = best * 1.025;
  const stepped = Math.max(best + 2.5, Math.round(target / 2.5) * 2.5);
  return Math.round(stepped * 10) / 10;
}

function isNewRecord(candidateWeight, candidateReps, existing) {
  if (!existing) return candidateWeight > 0;
  const candidateMax = epleyOneRepMax(candidateWeight, candidateReps);
  return candidateMax > existing.estimatedOneRepMax;
}

// Consecutive calendar weeks (ending with the current week) that contain at
// least one completed session. `dates` is an array of finishedAt values.
function weekStreak(dates) {
  if (!dates || dates.length === 0) return 0;
  const weekKeys = new Set();
  for (const d of dates) {
    const date = new Date(d);
    const monday = new Date(date);
    const day = (date.getDay() + 6) % 7; // Monday = 0
    monday.setDate(date.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    weekKeys.add(monday.getTime());
  }
  let streak = 0;
  const cursor = new Date();
  const day = (cursor.getDay() + 6) % 7;
  cursor.setDate(cursor.getDate() - day);
  cursor.setHours(0, 0, 0, 0);
  while (weekKeys.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = {
  epleyOneRepMax,
  setVolume,
  sessionVolume,
  suggestNextWeight,
  isNewRecord,
  weekStreak,
  startOfWeek,
};
