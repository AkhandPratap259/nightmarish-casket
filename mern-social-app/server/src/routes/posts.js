const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

function extractTags(text) {
  return [...new Set((text.match(/#[A-Za-z0-9_]+/g) || []).map((t) => t.slice(1).toLowerCase()))];
}
async function withCounts(post, viewerId) {
  const comments = await Comment.countDocuments({ post: post._id });
  return { _id: post._id, text: post.text, tags: post.tags, createdAt: post.createdAt,
    author: post.author, likeCount: post.likes.length, commentCount: comments,
    likedByMe: viewerId ? post.likes.some((id) => String(id) === String(viewerId)) : false };
}
// Create a post; the live feed is notified by the server's emit helper (res.locals.emit).
router.post('/', auth, async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Post text is required' });
    const post = await Post.create({ author: req.userId, text, tags: extractTags(text) });
    const full = await Post.findById(post._id).populate('author', 'name color bio');
    if (res.locals.emit) res.locals.emit('post:new', await withCounts(full, req.userId));
    res.status(201).json(await withCounts(full, req.userId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/:id', auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (String(post.author) !== String(req.userId)) return res.status(403).json({ error: 'Only the author can delete this post' });
  await Comment.deleteMany({ post: post._id });
  await Notification.deleteMany({ post: post._id });
  await post.deleteOne();
  res.json({ ok: true });
});
router.post('/:id/like', auth, async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', 'name color bio');
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const i = post.likes.findIndex((id) => String(id) === String(req.userId));
  let liked;
  if (i >= 0) { post.likes.splice(i, 1); liked = false; }
  else {
    post.likes.push(req.userId); liked = true;
    if (String(post.author._id) !== String(req.userId)) {
      const n = await Notification.create({ recipient: post.author._id, actor: req.userId, type: 'like', post: post._id });
      if (res.locals.emitTo) res.locals.emitTo(String(post.author._id), 'notification', n);
    }
  }
  await post.save();
  res.json({ ...(await withCounts(post, req.userId)), liked });
});
router.get('/:id/comments', async (req, res) => {
  const comments = await Comment.find({ post: req.params.id }).sort({ createdAt: 1 }).populate('author', 'name color');
  res.json(comments.map((c) => ({ _id: c._id, text: c.text, createdAt: c.createdAt, author: c.author })));
});
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Comment text is required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = await Comment.create({ post: post._id, author: req.userId, text });
    const full = await Comment.findById(comment._id).populate('author', 'name color');
    if (String(post.author) !== String(req.userId)) {
      const n = await Notification.create({ recipient: post.author, actor: req.userId, type: 'comment', post: post._id });
      if (res.locals.emitTo) res.locals.emitTo(String(post.author), 'notification', n);
    }
    res.status(201).json({ _id: full._id, text: full.text, createdAt: full.createdAt, author: full.author });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
