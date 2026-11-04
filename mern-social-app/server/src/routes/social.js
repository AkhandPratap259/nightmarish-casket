const express = require('express');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/search', auth, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  const users = await User.find({ name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).limit(10);
  res.json(users.map((u) => ({ _id: u._id, name: u.name, bio: u.bio, color: u.color,
    followersCount: u.followers.length, following: u.followers.some((id) => String(id) === String(req.userId)) })));
});
router.get('/suggestions', auth, async (req, res) => {
  const me = await User.findById(req.userId);
  const users = await User.find({ _id: { $nin: [...me.following, me._id] } }).limit(5);
  res.json(users.map((u) => ({ _id: u._id, name: u.name, bio: u.bio, color: u.color, followersCount: u.followers.length })));
});
router.get('/:id', auth, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const posts = await Post.find({ author: user._id }).sort({ createdAt: -1 }).populate('author', 'name color bio');
  const out = [];
  for (const p of posts) out.push({ _id: p._id, text: p.text, tags: p.tags, createdAt: p.createdAt,
    author: p.author, likeCount: p.likes.length,
    commentCount: await Comment.countDocuments({ post: p._id }),
    likedByMe: p.likes.some((id) => String(id) === String(req.userId)) });
  res.json({ _id: user._id, name: user.name, bio: user.bio, color: user.color,
    followingCount: user.following.length, followersCount: user.followers.length,
    followedByMe: user.followers.some((id) => String(id) === String(req.userId)), posts: out });
});
router.post('/:id/follow', auth, async (req, res) => {
  if (String(req.params.id) === String(req.userId)) return res.status(400).json({ error: 'You cannot follow yourself' });
  const [me, target] = await Promise.all([User.findById(req.userId), User.findById(req.params.id)]);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const i = me.following.findIndex((id) => String(id) === String(target._id));
  let following;
  if (i >= 0) { me.following.splice(i, 1); target.followers = target.followers.filter((id) => String(id) !== String(me._id)); following = false; }
  else {
    me.following.push(target._id); target.followers.push(me._id); following = true;
    const n = await Notification.create({ recipient: target._id, actor: me._id, type: 'follow' });
    if (res.locals.emitTo) res.locals.emitTo(String(target._id), 'notification', n);
  }
  await Promise.all([me.save(), target.save()]);
  res.json({ following, followersCount: target.followers.length });
});
module.exports = router;
