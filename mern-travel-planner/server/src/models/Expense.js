const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = ['stay', 'food', 'transport', 'sightseeing', 'shopping', 'other'];

const expenseSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    dayIndex: { type: Number, required: true, min: 0 },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'other' },
    amount: { type: Number, required: true, min: 0 },
    // Optional link to the activity this spend belongs to.
    activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
