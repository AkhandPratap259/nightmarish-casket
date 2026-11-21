const mongoose = require('mongoose');

const mealPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    slot: { type: String, required: true, enum: ['breakfast', 'lunch', 'dinner'] },
    recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', required: true },
    servings: { type: Number, required: true, min: 1, max: 24 },
  },
  { timestamps: true }
);

// One recipe per user per day per slot.
mealPlanSchema.index({ user: 1, date: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('MealPlan', mealPlanSchema);
