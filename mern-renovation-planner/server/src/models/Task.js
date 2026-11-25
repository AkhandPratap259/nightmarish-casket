const mongoose = require('mongoose');

const PHASES = ['Demolition', 'Structural', 'Electrical', 'Plumbing', 'Plaster & Paint', 'Flooring', 'Fixtures', 'Finishing'];

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  phase: { type: String, enum: PHASES, required: true },
  title: { type: String, required: true, trim: true },
  status: { type: String, enum: ['todo', 'doing', 'done'], default: 'todo' },
  estimatedCost: { type: Number, default: 0, min: 0 },
  actualCost: { type: Number, default: 0, min: 0 },
  dueDate: { type: Date },
  assignedContractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor' },
  dependsOn: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
}, { timestamps: true });

taskSchema.statics.PHASES = PHASES;

module.exports = mongoose.model('Task', taskSchema);
