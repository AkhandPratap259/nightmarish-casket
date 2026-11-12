const mongoose = require('mongoose');

const PACKING_CATEGORIES = ['documents', 'clothing', 'toiletries', 'tech', 'health', 'other'];

const packingItemSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
    label: { type: String, required: true, trim: true },
    category: { type: String, enum: PACKING_CATEGORIES, default: 'other' },
    checked: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PackingItem', packingItemSchema);
module.exports.PACKING_CATEGORIES = PACKING_CATEGORIES;

// Starter essentials offered by "Add from template" in the client.
module.exports.PACKING_TEMPLATE = [
  { label: 'Government photo ID', category: 'documents' },
  { label: 'Train / flight tickets (printed or offline copy)', category: 'documents' },
  { label: 'Hotel booking confirmation', category: 'documents' },
  { label: 'Comfortable walking shoes', category: 'clothing' },
  { label: 'Light jacket or shawl', category: 'clothing' },
  { label: '2–3 sets of clothes', category: 'clothing' },
  { label: 'Toothbrush and toothpaste', category: 'toiletries' },
  { label: 'Sunscreen', category: 'toiletries' },
  { label: 'Phone charger', category: 'tech' },
  { label: 'Power bank', category: 'tech' },
  { label: 'Basic medicines', category: 'health' },
  { label: 'Water bottle', category: 'health' },
];
