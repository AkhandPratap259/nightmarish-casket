const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['cook', 'admin'], default: 'cook' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return { id: this._id, name: this.name, email: this.email, role: this.role, active: this.active };
};

module.exports = mongoose.model('User', userSchema);
