const express = require('express');
const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Pledge = require('../models/Pledge');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { formatCampaign, percentFunded, publicPledge } = require('../utils/campaign');
const { emitToCampaign } = require('../utils/notify');

// mergeParams: this router is mounted at both /api/campaigns/:id/pledges
// and /api/pledges, so :id must survive the mount.
const router = express.Router({ mergeParams: true });

async function loadCampaignOr404(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return null;
  return Campaign.findById(req.params.id);
}

// POST /api/campaigns/:id/pledges — back a live campaign.
router.post(
  '/',
  auth,
  asyncHandler(async (req, res) => {
    const { amount, rewardId, anonymous } = req.body || {};
    const campaign = await loadCampaignOr404(req, res);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'live') {
      return res.status(409).json({ error: 'Campaign is not live' });
    }
    if (campaign.endsAt <= new Date()) {
      return res.status(409).json({ error: 'Campaign has ended' });
    }
    if (typeof amount !== 'number' || amount < campaign.minimumPledge) {
      return res.status(400).json({ error: `Amount must be at least ${campaign.minimumPledge}` });
    }

    let reward = null;
    if (rewardId) {
      reward = campaign.rewards.id(rewardId);
      if (!reward) return res.status(400).json({ error: 'Reward not found' });
      if (amount < reward.amount) {
        return res.status(400).json({ error: `Amount must be at least ${reward.amount} for this reward` });
      }
    }

    // Atomic increment first: only create the Pledge document after the
    // campaign totals (and the reward claim, when applicable) moved.
    const now = new Date();
    let result;
    if (reward) {
      // Atomic claim in a single updateOne. The top-level $expr checks
      // that THIS tier still has stock (claimed < quantity, or unlimited)
      // using the document's CURRENT values, and the pipeline $set then
      // increments only that tier's claimed count. Two simpler shapes
      // were tried and both fail: separate 'rewards._id' /
      // 'rewards.claimed' conditions let the positional $ land on the
      // wrong tier, and $expr inside $elemMatch is rejected by MongoDB
      // ("$expr can only be applied to the top-level document").
      const filter = {
        _id: campaign._id,
        status: 'live',
        endsAt: { $gt: now },
        $expr: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$rewards',
                  as: 'r',
                  cond: {
                    $and: [
                      { $eq: ['$$r._id', reward._id] },
                      {
                        $or: [
                          { $eq: ['$$r.quantity', null] },
                          { $lt: ['$$r.claimed', '$$r.quantity'] },
                        ],
                      },
                    ],
                  },
                },
              },
            },
            0,
          ],
        },
      };
      const pipeline = [
        {
          $set: {
            rewards: {
              $map: {
                input: '$rewards',
                as: 'r',
                in: {
                  $cond: [
                    { $eq: ['$$r._id', reward._id] },
                    { $mergeObjects: ['$$r', { claimed: { $add: ['$$r.claimed', 1] } }] },
                    '$$r',
                  ],
                },
              },
            },
            pledgedTotal: { $add: ['$pledgedTotal', amount] },
            backerCount: { $add: ['$backerCount', 1] },
          },
        },
      ];
      result = await Campaign.updateOne(filter, pipeline);
      if (result.modifiedCount !== 1) {
        return res.status(409).json({ error: 'This reward is sold out' });
      }
    } else {
      result = await Campaign.updateOne(
        { _id: campaign._id, status: 'live', endsAt: { $gt: now } },
        { $inc: { pledgedTotal: amount, backerCount: 1 } }
      );
      if (result.modifiedCount !== 1) {
        return res.status(409).json({ error: 'Campaign is not live' });
      }
    }

    const pledge = await Pledge.create({
      campaign: campaign._id,
      backer: req.user._id,
      amount,
      rewardTitle: reward ? reward.title : '',
      rewardId: reward ? reward._id.toString() : '',
      anonymous: Boolean(anonymous),
      paymentStatus: 'mock-paid',
    });

    const updated = await Campaign.findById(campaign._id);
    emitToCampaign(campaign._id.toString(), 'pledge:new', {
      campaignId: campaign._id.toString(),
      amount,
      backerName: pledge.anonymous ? 'Anonymous' : req.user.name,
      pledgedTotal: updated.pledgedTotal,
      backerCount: updated.backerCount,
    });

    return res.status(201).json({
      data: {
        pledge: {
          id: pledge._id,
          campaign: pledge.campaign,
          backer: pledge.backer,
          amount: pledge.amount,
          rewardTitle: pledge.rewardTitle,
          rewardId: pledge.rewardId,
          anonymous: pledge.anonymous,
          paymentStatus: pledge.paymentStatus,
          createdAt: pledge.createdAt,
        },
        campaign: {
          pledgedTotal: updated.pledgedTotal,
          backerCount: updated.backerCount,
          percentFunded: percentFunded(updated),
        },
      },
    });
  })
);

// GET /api/campaigns/:id/pledges — public, latest 50.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const campaign = await loadCampaignOr404(req, res);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const pledges = await Pledge.find({ campaign: campaign._id })
      .populate('backer', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({ data: { pledges: pledges.map(publicPledge) } });
  })
);

// GET /api/pledges/mine — the signed-in user's pledges, newest first.
router.get(
  '/mine',
  auth,
  asyncHandler(async (req, res) => {
    const pledges = await Pledge.find({ backer: req.user._id })
      .populate('campaign', 'title status')
      .sort({ createdAt: -1 });
    return res.json({
      data: {
        pledges: pledges.map((p) => ({
          id: p._id,
          amount: p.amount,
          rewardTitle: p.rewardTitle,
          rewardId: p.rewardId,
          anonymous: p.anonymous,
          paymentStatus: p.paymentStatus,
          createdAt: p.createdAt,
          campaign: p.campaign
            ? { id: p.campaign._id, title: p.campaign.title, status: p.campaign.status }
            : null,
        })),
      },
    });
  })
);

module.exports = router;
