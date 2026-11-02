const mongoose = require('mongoose');
const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, default: '' },
  durationMinutes: { type: Number, default: 10, min: 1 },
  order: { type: Number, default: 0 },
});
const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true, trim: true },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  price: { type: Number, default: 0, min: 0 },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lessons: [lessonSchema],
  published: { type: Boolean, default: true },
}, { timestamps: true });
courseSchema.index({ title: 'text', description: 'text' });
module.exports = mongoose.model('Course', courseSchema);
