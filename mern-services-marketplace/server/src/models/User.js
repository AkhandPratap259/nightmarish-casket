const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['customer', 'provider', 'admin'],
      default: 'customer',
    },
    phone: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: 'Azamgarh' },
    // Short bio shown on provider cards. Empty for customers.
    bio: { type: String, trim: true, default: '', maxlength: 500 },
    yearsExperience: { type: Number, default: 0, min: 0, max: 60 },
    avatarColor: { type: String, default: '#e8501a', trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    city: this.city,
    bio: this.bio,
    yearsExperience: this.yearsExperience,
    avatarColor: this.avatarColor,
    active: this.active,
  };
};

module.exports = mongoose.model('User', userSchema);
