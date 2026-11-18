const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['member', 'trainer', 'admin'], default: 'member' },
    goal: {
      type: String,
      enum: ['strength', 'hypertrophy', 'endurance', 'general'],
      default: 'general',
    },
    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
