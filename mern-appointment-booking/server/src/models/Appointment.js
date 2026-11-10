const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicine: { type: String, required: true },
    dosage: { type: String, default: '' },
    duration: { type: String, default: '' },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // date stored as YYYY-MM-DD (doctor's local calendar day)
    date: { type: String, required: true },
    // time stored as HH:MM (24h) slot start
    time: { type: String, required: true },
    reason: { type: String, default: '' },
    status: {
      type: String,
      enum: ['booked', 'confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'booked',
    },
    fee: { type: Number, default: 0 },
    visitNotes: { type: String, default: '' },
    prescription: { type: [prescriptionItemSchema], default: [] },
    fromWaitlist: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A doctor can hold only one active appointment per slot. Cancelled /
// completed / no-show appointments free the slot again.
appointmentSchema.index(
  { doctor: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['booked', 'confirmed'] } },
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
