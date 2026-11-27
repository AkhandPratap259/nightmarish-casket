const mongoose = require('mongoose');
const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true },
});
// Separate documents keep growing chat histories out of the task's BSON limit.
// No TTL, expiration, or cascading deletion is configured.
const schema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Project' },
  task: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Task' },
  author: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  authorName: { type: String, required: true },
  text: { type: String, default: '', maxlength: 12000 },
  kind: { type: String, enum: ['message', 'work'], default: 'message' },
  attachments: { type: [attachmentSchema], default: [] },
}, { timestamps: true });
schema.index({ project: 1, task: 1, createdAt: 1, _id: 1 });
module.exports = mongoose.model('CardMessage', schema);
