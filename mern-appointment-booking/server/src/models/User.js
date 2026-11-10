const mongoose = require('mongoose');

const scheduleSessionSchema = new mongoose.Schema(
  { start: { type: String, required: true }, end: { type: String, required: true } },
  { _id: false }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    speciality: { type: String, required: true },
    qualification: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    clinic: { type: String, default: '' },
    city: { type: String, default: '' },
    fee: { type: Number, default: 0 },
    bio: { type: String, default: '' },
    // days: JS day numbers 0 (Sun) – 6 (Sat) on which the doctor consults
    days: { type: [Number], default: [1, 2, 3, 4, 5] },
    sessions: { type: [scheduleSessionSchema], default: [{ start: '09:00', end: '13:00' }] },
    slotMinutes: { type: Number, default: 30 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    phone: { type: String, default: '' },
    doctorProfile: { type: doctorProfileSchema, default: undefined },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
