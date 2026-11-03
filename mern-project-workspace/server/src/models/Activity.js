const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    taskTitle: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
