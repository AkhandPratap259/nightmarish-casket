const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['learner', 'instructor', 'admin'], default: 'learner' },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    // Stored as 'YYYY-MM-DD' (server local date) so streaks compare by day.
    lastActiveDate: { type: String, default: '' },
    dailyXp: { type: Number, default: 0 },
    dailyXpDate: { type: String, default: '' },
    lessonsCompleted: { type: Number, default: 0 },
    reviewCorrect: { type: Number, default: 0 },
    flawlessLessons: { type: Number, default: 0 },
    achievements: { type: [achievementSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
