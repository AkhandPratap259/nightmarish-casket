const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    recipes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Collection', collectionSchema);
