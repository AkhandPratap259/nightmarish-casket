const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['creator', 'member'], default: 'member' },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, default: '', maxlength: 500 },
    currency: { type: String, trim: true, default: '₹', maxlength: 5 },
    members: { type: [memberSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

groupSchema.methods.isMember = function isMember(userId) {
  return this.members.some((m) => String(m.user) === String(userId));
};

groupSchema.methods.memberRole = function memberRole(userId) {
  const found = this.members.find((m) => String(m.user) === String(userId));
  return found ? found.role : null;
};

module.exports = mongoose.model('Group', groupSchema);
