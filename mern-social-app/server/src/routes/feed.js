const express = require('express');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Feed score: engagement (likes x3, comments x5) decayed by age, plus an
// affinity bonus for authors the viewer follows. This is what makes "For You"
// different from a plain newest-first list.
function scorePost(post, commentCount, followedAuthorIds, viewerId) {
  const hours = Math.max(0, (Date.now() - new Date(post.createdAt)) / 3600000);
  const decay = 1 / (1 + hours / 12);
  const engagement = post.likes.length * 3 + commentCount * 5;
  const affinity = followedAuthorIds.has(String(post.author._id)) ? 20 : 0;
  const own = String(post.author._id) === String(viewerId) ? 5 : 0;
  const score = Math.round((engagement * decay + affinity + own) * 10) / 10;
  return { score, breakdown: { likes: post.likes.length, comments: commentCount, decay: Math.round(decay * 100) / 100, affinity, own } };
}
router.get('/', auth, async (req, res) => {
  const tab = req.query.tab || 'foryou';
  const me = await User.findById(req.userId);
  const followed = new Set(me.following.map(String));
  let query = {};
  if (tab === 'following') query = { author: { $in: [...me.following, me._id] } };
  const posts = await Post.find(query).sort({ createdAt: -1 }).limit(100).populate('author', 'name color bio');
  const scored = [];
  for (const p of posts) {
    const comments = await Comment.countDocuments({ post: p._id });
    const s = scorePost(p, comments, followed, req.userId);
    scored.push({ _id: p._id, text: p.text, tags: p.tags, createdAt: p.createdAt, author: p.author,
      likeCount: p.likes.length, commentCount: comments,
      likedByMe: p.likes.some((id) => String(id) === String(req.userId)), ...s });
  }
  if (tab === 'trending') scored.sort((a, b) => (b.likeCount + b.commentCount * 2) - (a.likeCount + a.commentCount * 2));
  else scored.sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt));
  res.json(scored.slice(0, 50));
});
router.get('/trending', auth, async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 3600000);
  const posts = await Post.find({ createdAt: { $gte: since } });
  const map = new Map();
  for (const p of posts) for (const t of p.tags) {
    const hours = Math.max(0, (Date.now() - new Date(p.createdAt)) / 3600000);
    map.set(t, (map.get(t) || 0) + 1 / (1 + hours / 24));
  }
  res.json([...map.entries()].map(([tag, score]) => ({ tag, score: Math.round(score * 10) / 10 }))
    .sort((a, b) => b.score - a.score).slice(0, 10));
});
module.exports = router;
