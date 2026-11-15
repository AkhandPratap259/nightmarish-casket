const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema(
  {
    word: { type: String, required: true },
    // For Japanese this is the romaji reading, used for typed answers and
    // for speech synthesis the kana form (audioText) is used instead.
    reading: { type: String, default: '' },
    translation: { type: String, required: true },
    example: { type: String, default: '' },
    exampleEn: { type: String, default: '' },
  },
  { _id: false }
);

const exerciseSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['mc', 'fill', 'match', 'listen'], required: true },
    prompt: { type: String, required: true },
    question: { type: String, default: '' },
    // Multiple-choice / listening options (display strings).
    options: { type: [String], default: [] },
    // Correct answer. Never sent to the client; answers are validated here.
    answer: { type: String, default: '' },
    // Matching pairs: [{ a, b }].
    pairs: {
      type: [{ a: String, b: String }],
      default: [],
    },
    // Text spoken by the browser speechSynthesis API for listen exercises.
    audioText: { type: String, default: '' },
    // Word + translation behind this exercise, for the review queue when
    // the learner gets it wrong.
    word: { type: String, default: '' },
    translation: { type: String, default: '' },
  },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
    language: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true },
    languageCode: { type: String, required: true },
    unit: { type: Number, required: true },
    unitTitle: { type: String, required: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    xpReward: { type: Number, default: 20 },
    words: { type: [wordSchema], default: [] },
    exercises: { type: [exerciseSchema], default: [] },
  },
  { timestamps: true }
);

// Lessons unlock in sequence inside a language: unit, then order.
lessonSchema.index({ language: 1, unit: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
