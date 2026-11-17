const express = require('express');
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Update = require('../models/Update');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

// mergeParams: mounted at /api/campaigns/:id/updates.
const router = express.Router({ mergeParams: true });

async function loadCampaign(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return null;
  return Campaign.findById(req.params.id);
}

// GET /api/campaigns/:id/updates — public.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const campaign = await loadCampaign(req, res);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const updates = await Update.find({ campaign: campaign._id })
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    return res.json({
      data: {
        updates: updates.map((u) => ({
          id: u._id,
          title: u.title,
          body: u.body,
          authorName: u.author ? u.author.name : 'Unknown',
          createdAt: u.createdAt,
        })),
      },
    });
  })
);

// POST /api/campaigns/:id/updates — campaign owner or admin.
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const campaign = await loadCampaign(req, res);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const isOwnerOrAdmin =
      req.user.role === 'admin' || campaign.creator.toString() === req.user._id.toString();
    if (!isOwnerOrAdmin) {
      return res.status(403).json({ error: 'Only the campaign creator or an admin can post updates' });
    }
    const { title, body } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });
    const update = await Update.create({
      campaign: campaign._id,
      author: req.user._id,
      title,
      body,
    });
    return res.status(201).json({
      data: {
        update: {
          id: update._id,
          title: update.title,
          body: update.body,
          authorName: req.user.name,
          createdAt: update.createdAt,
        },
      },
    });
  })
);

module.exports = router;
