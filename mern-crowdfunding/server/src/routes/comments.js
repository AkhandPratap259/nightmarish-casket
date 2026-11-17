const express = require('express');
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Comment = require('../models/Comment');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

// mergeParams: mounted at /api/campaigns/:id/comments.
const router = express.Router({ mergeParams: true });

async function loadCampaign(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return null;
  return Campaign.findById(req.params.id);
}

// GET /api/campaigns/:id/comments — public, with author names.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const campaign = await loadCampaign(req, res);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const comments = await Comment.find({ campaign: campaign._id })
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    return res.json({
      data: {
        comments: comments.map((c) => ({
          id: c._id,
          body: c.body,
          authorName: c.author ? c.author.name : 'Unknown',
          createdAt: c.createdAt,
        })),
      },
    });
  })
);

// POST /api/campaigns/:id/comments — any signed-in user.
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const campaign = await loadCampaign(req, res);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: 'Comment body is required' });
    if (body.length > 500) return res.status(400).json({ error: 'Comment must be at most 500 characters' });
    const comment = await Comment.create({
      campaign: campaign._id,
      author: req.user._id,
      body: body.trim(),
    });
    return res.status(201).json({
      data: {
        comment: {
          id: comment._id,
          body: comment.body,
          authorName: req.user.name,
          createdAt: comment.createdAt,
        },
      },
    });
  })
);

module.exports = router;
