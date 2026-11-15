const mongoose = require('mongoose');

// Spaced-repetition review item. Simple interval rule: a correct review
// doubles the interval (1 -> 2 -> 4 -> 8 -> 16 -> 30 days, capped at 30);
// a wrong answer resets the interval to 1 day.
const reviewItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    word: { type: String, required: true },
    reading: { type: String, default: '' },
    translation: { type: String, required: true },
    languageCode: { type: String, required: true },
    intervalDays: { type: Number, default: 1 },
    dueAt: { type: Date, required: true },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reviewItemSchema.index({ user: 1, word: 1, languageCode: 1 }, { unique: true });
reviewItemSchema.index({ user: 1, dueAt: 1 });

module.exports = mongoose.model('ReviewItem', reviewItemSchema);
