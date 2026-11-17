const express = require('express');
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Pledge = require('../models/Pledge');
const Update = require('../models/Update');
const Comment = require('../models/Comment');
const { auth, optionalAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { formatCampaign, publicPledge } = require('../utils/campaign');

const router = express.Router();

const CATEGORIES = ['technology', 'arts', 'community', 'environment', 'food', 'games', 'education', 'health'];
const STATUSES = ['draft', 'live', 'funded', 'failed', 'fulfilled'];

function isOwnerOrAdmin(req, campaign) {
  return req.user && (req.user.role === 'admin' || campaign.creator.toString() === req.user._id.toString());
}

async function loadCampaign(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  req.campaign = campaign;
  return next();
}

// GET /api/campaigns — public list with search, filters, sorting, pagination.
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { search, category, status, sort } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ title: regex }, { tagline: regex }, { story: regex }];
    }
    if (category) {
      if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
      filter.category = category;
    }
    if (status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      if (status === 'draft') {
        // Drafts are only visible to their owner, or to an admin.
        if (!req.user) return res.status(401).json({ error: 'Sign in required' });
        filter.status = 'draft';
        if (req.user.role !== 'admin') filter.creator = req.user._id;
      } else {
        filter.status = status;
      }
    } else {
      filter.status = { $ne: 'draft' };
    }

    const total = await Campaign.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;

    let docs;
    if (sort === 'ending') {
      // Live campaigns first, then by nearest deadline.
      docs = await Campaign.aggregate([
        { $match: filter },
        { $addFields: { _isLive: { $eq: ['$status', 'live'] } } },
        { $sort: { _isLive: -1, endsAt: 1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
      docs = await Campaign.populate(docs, { path: 'creator', select: 'name email' });
    } else {
      let sortSpec = { createdAt: -1 };
      if (sort === 'most-funded') sortSpec = { pledgedTotal: -1 };
      else if (sort === 'goal') sortSpec = { goal: 1 };
      docs = await Campaign.find(filter)
        .populate('creator', 'name email')
        .sort(sortSpec)
        .skip(skip)
        .limit(limit);
    }

    return res.json({
      data: { campaigns: docs.map(formatCampaign), page, pages, total },
    });
  })
);

// GET /api/campaigns/:id — public detail. Drafts: owner or admin only.
router.get(
  '/:id',
  optionalAuth,
  loadCampaign,
  asyncHandler(async (req, res) => {
    const campaign = req.campaign;
    if (campaign.status === 'draft' && !isOwnerOrAdmin(req, campaign)) {
      if (!req.user) return res.status(401).json({ error: 'Sign in required' });
      return res.status(403).json({ error: 'This campaign is still a draft' });
    }
    const full = await Campaign.findById(campaign._id).populate('creator', 'name email');
    const [pledges, updates, comments] = await Promise.all([
      Pledge.find({ campaign: campaign._id }).populate('backer', 'name').sort({ createdAt: -1 }).limit(20),
      Update.find({ campaign: campaign._id }).populate('author', 'name').sort({ createdAt: -1 }),
      Comment.find({ campaign: campaign._id }).populate('author', 'name').sort({ createdAt: -1 }),
    ]);
    return res.json({
      data: {
        campaign: formatCampaign(full),
        pledges: pledges.map(publicPledge),
        updates: updates.map((u) => ({
          id: u._id,
          title: u.title,
          body: u.body,
          authorName: u.author ? u.author.name : 'Unknown',
          createdAt: u.createdAt,
        })),
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

// POST /api/campaigns — creator or admin; creates a draft campaign.
router.post(
  '/',
  auth,
  requireRole('creator', 'admin'),
  asyncHandler(async (req, res) => {
    const { title, tagline, story, category, goal, endsAt, minimumPledge, rewards, stretchGoals } = req.body || {};
    if (!title || !tagline || !story) {
      return res.status(400).json({ error: 'Title, tagline and story are required' });
    }
    if (!category || !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'A valid category is required' });
    }
    if (typeof goal !== 'number' || goal < 100) {
      return res.status(400).json({ error: 'Goal must be at least 100' });
    }
    const ends = endsAt ? new Date(endsAt) : null;
    if (!ends || Number.isNaN(ends.getTime()) || ends <= new Date()) {
      return res.status(400).json({ error: 'endsAt must be a date in the future' });
    }
    const minPledge = minimumPledge === undefined ? 5 : minimumPledge;
    if (typeof minPledge !== 'number' || minPledge < 1) {
      return res.status(400).json({ error: 'minimumPledge must be at least 1' });
    }
    const cleanRewards = [];
    if (rewards !== undefined) {
      if (!Array.isArray(rewards)) return res.status(400).json({ error: 'rewards must be an array' });
      for (const r of rewards) {
        if (!r || !r.title || typeof r.amount !== 'number' || r.amount < minPledge) {
          return res
            .status(400)
            .json({ error: 'Each reward needs a title and an amount of at least the minimum pledge' });
        }
        cleanRewards.push({
          title: r.title,
          amount: r.amount,
          description: r.description || '',
          quantity: r.quantity === undefined || r.quantity === null ? null : r.quantity,
        });
      }
    }
    const cleanStretch = [];
    if (stretchGoals !== undefined) {
      if (!Array.isArray(stretchGoals)) return res.status(400).json({ error: 'stretchGoals must be an array' });
      for (const s of stretchGoals) {
        if (!s || typeof s.amount !== 'number' || s.amount <= goal || !s.title) {
          return res.status(400).json({ error: 'Each stretch goal needs a title and an amount above the goal' });
        }
        cleanStretch.push({ amount: s.amount, title: s.title });
      }
    }
    const campaign = await Campaign.create({
      title,
      tagline,
      story,
      category,
      goal,
      endsAt: ends,
      minimumPledge: minPledge,
      rewards: cleanRewards,
      stretchGoals: cleanStretch,
      creator: req.user._id,
    });
    return res.status(201).json({ data: { campaign: formatCampaign(campaign) } });
  })
);

// PUT /api/campaigns/:id — owner creator or admin, only while draft or live.
router.put(
  '/:id',
  auth,
  loadCampaign,
  asyncHandler(async (req, res) => {
    const campaign = req.campaign;
    if (!isOwnerOrAdmin(req, campaign)) {
      return res.status(403).json({ error: 'Only the campaign creator or an admin can edit this campaign' });
    }
    if (!['draft', 'live'].includes(campaign.status)) {
      return res.status(409).json({ error: 'Only draft or live campaigns can be edited' });
    }
    const { title, tagline, story, category } = req.body || {};
    if (title !== undefined) campaign.title = title;
    if (tagline !== undefined) campaign.tagline = tagline;
    if (story !== undefined) campaign.story = story;
    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
      campaign.category = category;
    }
    if (!campaign.title || !campaign.tagline || !campaign.story) {
      return res.status(400).json({ error: 'Title, tagline and story are required' });
    }
    await campaign.save();
    return res.json({ data: { campaign: formatCampaign(campaign) } });
  })
);

// POST /api/campaigns/:id/publish — draft only.
router.post(
  '/:id/publish',
  auth,
  loadCampaign,
  asyncHandler(async (req, res) => {
    const campaign = req.campaign;
    if (!isOwnerOrAdmin(req, campaign)) {
      return res.status(403).json({ error: 'Only the campaign creator or an admin can publish this campaign' });
    }
    if (campaign.status !== 'draft') {
      return res.status(409).json({ error: 'Only draft campaigns can be published' });
    }
    campaign.status = 'live';
    await campaign.save();
    return res.json({ data: { campaign: formatCampaign(campaign) } });
  })
);

// POST /api/campaigns/:id/fulfill — funded only.
router.post(
  '/:id/fulfill',
  auth,
  loadCampaign,
  asyncHandler(async (req, res) => {
    const campaign = req.campaign;
    if (!isOwnerOrAdmin(req, campaign)) {
      return res.status(403).json({ error: 'Only the campaign creator or an admin can fulfil this campaign' });
    }
    if (campaign.status !== 'funded') {
      return res.status(409).json({ error: 'Only funded campaigns can be marked fulfilled' });
    }
    campaign.status = 'fulfilled';
    await campaign.save();
    return res.json({ data: { campaign: formatCampaign(campaign) } });
  })
);

// DELETE /api/campaigns/:id — draft only.
router.delete(
  '/:id',
  auth,
  loadCampaign,
  asyncHandler(async (req, res) => {
    const campaign = req.campaign;
    if (!isOwnerOrAdmin(req, campaign)) {
      return res.status(403).json({ error: 'Only the campaign creator or an admin can delete this campaign' });
    }
    if (campaign.status !== 'draft') {
      return res.status(409).json({ error: 'Only draft campaigns can be deleted' });
    }
    await campaign.deleteOne();
    return res.json({ data: { deleted: true } });
  })
);

module.exports = router;
