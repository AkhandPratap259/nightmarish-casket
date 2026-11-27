const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const { Task } = require('../models/Task');
const CardMessage = require('../models/CardMessage');
const { requireAuth } = require('../middleware/auth');
const router = express.Router({ mergeParams: true });
const MAX_BYTES = 8 * 1024 * 1024;
const safe = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res, next)).catch(next);
const metadata = '-attachments.data -__v';
const validId = id => mongoose.isObjectIdOrHexString(id);

router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
router.use(requireAuth);
router.use(safe(async (req, res, next) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Card not found' });
  const task = await Task.findById(req.params.id).select('project').lean();
  if (!task) return res.status(404).json({ error: 'Card not found' });
  const member = await Project.exists({ _id: task.project, $or: [{ owner: req.user._id }, { members: req.user._id }] });
  if (!member) return res.status(403).json({ error: 'Not a member of this project' });
  req.chatScope = { project: task.project, task: task._id };
  next();
}));

router.get('/', safe(async (req, res) => {
  // All history, ordered consistently even if two posts have equal timestamps.
  // Only metadata is read; file bytes are fetched separately on demand.
  const messages = await CardMessage.find(req.chatScope).select(metadata).sort({ createdAt: 1, _id: 1 }).lean();
  res.json({ messages });
}));

router.post('/', express.json({ limit: '12mb' }), safe(async (req, res) => {
  const body = req.body || {};
  if (typeof (body.text ?? '') !== 'string') return res.status(400).json({ error: 'Invalid message' });
  const text = (body.text || '').trim();
  const kind = body.kind || 'message';
  if (text.length > 12000 || !['message', 'work'].includes(kind)) return res.status(400).json({ error: 'Invalid message type or length (maximum 12,000 characters)' });
  const files = body.attachments ?? [];
  if (!Array.isArray(files) || files.length > 5) return res.status(400).json({ error: 'Attach at most five files per post' });
  if (!text && !files.length) return res.status(400).json({ error: 'Write a message or attach a file' });
  let total = 0;
  const attachments = [];
  for (const file of files) {
    if (!file || typeof file.name !== 'string' || typeof file.data !== 'string') return res.status(400).json({ error: 'Invalid attachment' });
    const name = file.name.split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g, '').trim();
    if (!name || name.length > 255 || file.data.length > Math.ceil(MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.data) || file.data.length % 4 !== 0) return res.status(400).json({ error: 'Invalid attachment or filename' });
    const data = Buffer.from(file.data, 'base64');
    if (data.toString('base64') !== file.data || !data.length) return res.status(400).json({ error: 'Invalid or empty file' });
    total += data.length;
    if (total > MAX_BYTES) return res.status(413).json({ error: 'Attachments may total at most 8 MB per post' });
    attachments.push({ name, size: data.length, data });
  }
  // One atomic insert includes both text and bytes. Nothing is visible until persisted.
  const message = await CardMessage.create({ ...req.chatScope, author: req.user._id, authorName: req.user.name, text, kind, attachments });
  const result = message.toObject();
  result.attachments = result.attachments.map(({ _id, name, size }) => ({ _id, name, size }));
  res.status(201).json({ message: result });
}));

router.get('/:messageId/files/:fileId', safe(async (req, res) => {
  const { messageId, fileId } = req.params;
  if (!validId(messageId) || !validId(fileId)) return res.status(404).json({ error: 'Attachment not found' });
  const message = await CardMessage.findOne({ ...req.chatScope, _id: messageId, 'attachments._id': fileId });
  const file = message?.attachments.id(fileId);
  if (!file) return res.status(404).json({ error: 'Attachment not found' });
  // Never serve uploaded HTML/SVG or other executable content inline.
  res.attachment(file.name);
  res.set('Content-Type', 'application/octet-stream');
  res.set('X-Content-Type-Options', 'nosniff');
  res.send(Buffer.from(file.data));
}));
router.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Attachments may total at most 8 MB per post' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid message data' });
  next(err);
});
module.exports = router;
