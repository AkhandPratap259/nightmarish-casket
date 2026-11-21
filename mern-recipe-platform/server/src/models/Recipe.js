const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, maxlength: 20 },
  },
  { _id: false }
);

const stepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true, min: 1 },
    text: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    cuisine: { type: String, required: true, trim: true, maxlength: 40 },
    category: {
      type: String,
      required: true,
      enum: ['Breakfast', 'Main', 'Dessert', 'Snack', 'Drink'],
    },
    difficulty: { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
    prepTimeMin: { type: Number, required: true, min: 0, max: 600 },
    cookTimeMin: { type: Number, required: true, min: 0, max: 600 },
    servings: { type: Number, required: true, min: 1, max: 24 },
    ingredients: { type: [ingredientSchema], required: true, validate: (v) => v.length > 0 },
    steps: { type: [stepSchema], required: true, validate: (v) => v.length > 0 },
    tags: { type: [String], default: [] },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    timesCooked: { type: Number, default: 0 },
    hidden: { type: Boolean, default: false },
    flagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

recipeSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Recipe', recipeSchema);
