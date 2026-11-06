const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema(
  {
    role: { type: String, default: '' },
    company: { type: String, default: '' },
    start: { type: String, default: '' },
    end: { type: String, default: '' },
    current: { type: Boolean, default: false },
    bullets: { type: [String], default: [] },
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, default: '' },
    school: { type: String, default: '' },
    start: { type: String, default: '' },
    end: { type: String, default: '' },
    details: { type: String, default: '' },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    link: { type: String, default: '' },
    description: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    template: { type: String, enum: ['editorial', 'split', 'classic'], default: 'editorial' },
    status: { type: String, enum: ['draft', 'ready'], default: 'draft' },
    personal: {
      name: { type: String, default: '' },
      headline: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      website: { type: String, default: '' },
      summary: { type: String, default: '' },
    },
    experience: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    skills: { type: [String], default: [] },
    projects: { type: [projectSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);
