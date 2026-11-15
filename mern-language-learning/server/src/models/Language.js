const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nativeName: { type: String, required: true },
    // BCP 47 tag used by the browser speechSynthesis API for listen exercises.
    speechLang: { type: String, required: true },
    tagline: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy start', 'Moderate', 'New script'], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Language', languageSchema);
