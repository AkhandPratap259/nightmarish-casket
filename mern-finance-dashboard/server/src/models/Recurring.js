const mongoose = require('mongoose');

const recurringSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0.01 },
    kind: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    frequency: { type: String, enum: ['monthly', 'weekly'], default: 'monthly' },
    dayOfMonth: { type: Number, min: 1, max: 28 },
    weekday: { type: Number, min: 0, max: 6 },
    nextDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recurring', recurringSchema);
