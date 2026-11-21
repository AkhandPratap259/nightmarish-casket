const mongoose = require('mongoose');

const groceryItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStart: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    unit: { type: String, required: true, trim: true, maxlength: 20 },
    quantity: { type: Number, required: true, min: 0 },
    checked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

groceryItemSchema.index({ user: 1, weekStart: 1, name: 1, unit: 1 }, { unique: true });

module.exports = mongoose.model('GroceryItem', groceryItemSchema);
