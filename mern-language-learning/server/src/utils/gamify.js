const XpEvent = require('../models/XpEvent');
const { emitToAll } = require('./notify');

const DAILY_GOAL_XP = 50;
const XP_PER_CORRECT = 10;
const XP_PER_REVIEW = 5;

// Level curve: reaching level n needs 50 * (n - 1) * n total XP.
// Level 2 at 100 XP, level 3 at 300, level 4 at 600, level 5 at 1000.
function xpForLevel(level) {
  return 50 * (level - 1) * level;
}

function levelForXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

// Streak rule: activity today keeps the streak; activity the day after the
// last active day extends it by one; any longer gap resets it to 1.
function touchStreak(user) {
  const today = dayKey();
  if (user.lastActiveDate === today) return;
  if (user.lastActiveDate === yesterdayKey()) {
    user.streak += 1;
  } else {
    user.streak = 1;
  }
  user.lastActiveDate = today;
}

function resetDailyIfNeeded(user) {
  const today = dayKey();
  if (user.dailyXpDate !== today) {
    user.dailyXp = 0;
    user.dailyXpDate = today;
  }
}

async function awardXp(user, amount, source) {
  resetDailyIfNeeded(user);
  touchStreak(user);
  const beforeLevel = user.level;
  user.xp += amount;
  user.dailyXp += amount;
  user.level = levelForXp(user.xp);
  await user.save();
  await XpEvent.create({ user: user._id, xp: amount, source });
  // One broadcast only: every client refreshes the weekly leaderboard.
  emitToAll('leaderboard:update', { userId: String(user._id), xp: user.xp });
  return { xp: user.xp, level: user.level, leveledUp: user.level > beforeLevel, streak: user.streak };
}

const ACHIEVEMENT_DEFS = [
  { key: 'first-lesson', title: 'First steps', check: (u) => u.lessonsCompleted >= 1 },
  { key: 'lessons-5', title: 'Five lessons in', check: (u) => u.lessonsCompleted >= 5 },
  { key: 'lessons-10', title: 'Ten lessons strong', check: (u) => u.lessonsCompleted >= 10 },
  { key: 'xp-100', title: 'Century club', check: (u) => u.xp >= 100 },
  { key: 'xp-500', title: 'Word hoarder', check: (u) => u.xp >= 500 },
  { key: 'streak-3', title: 'Three-day fire', check: (u) => u.streak >= 3 },
  { key: 'streak-7', title: 'Week of fire', check: (u) => u.streak >= 7 },
  { key: 'review-10', title: 'Review master', check: (u) => u.reviewCorrect >= 10 },
  { key: 'flawless', title: 'Flawless', check: (u) => u.flawlessLessons >= 1 },
];

async function checkAchievements(user) {
  const earned = new Set(user.achievements.map((a) => a.key));
  const newly = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (!earned.has(def.key) && def.check(user)) {
      user.achievements.push({ key: def.key, title: def.title, earnedAt: new Date() });
      newly.push(def);
    }
  }
  if (newly.length) await user.save();
  return newly;
}

module.exports = {
  DAILY_GOAL_XP,
  XP_PER_CORRECT,
  XP_PER_REVIEW,
  xpForLevel,
  levelForXp,
  dayKey,
  touchStreak,
  resetDailyIfNeeded,
  awardXp,
  checkAchievements,
  ACHIEVEMENT_DEFS,
};
