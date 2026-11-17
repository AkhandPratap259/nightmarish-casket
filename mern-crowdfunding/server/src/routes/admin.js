const express = require('express');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Pledge = require('../models/Pledge');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { formatCampaign, publicPledge } = require('../utils/campaign');

const router = express.Router();

// GET /api/admin/overview — admin only.
router.get(
  '/overview',
  auth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const [userCount, campaignCount, pledgeCount, pledgedAgg, statusAgg, recentPledges, recentCampaigns] =
      await Promise.all([
        User.countDocuments(),
        Campaign.countDocuments(),
        Pledge.countDocuments(),
        Campaign.aggregate([{ $group: { _id: null, total: { $sum: '$pledgedTotal' } } }]),
        Campaign.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Pledge.find().populate('campaign', 'title').populate('backer', 'name').sort({ createdAt: -1 }).limit(10),
        Campaign.find().populate('creator', 'name').sort({ createdAt: -1 }).limit(10),
      ]);

    const campaignsByStatus = { live: 0, funded: 0, failed: 0, fulfilled: 0, draft: 0 };
    for (const row of statusAgg) {
      if (Object.prototype.hasOwnProperty.call(campaignsByStatus, row._id)) {
        campaignsByStatus[row._id] = row.count;
      }
    }

    return res.json({
      data: {
        totals: {
          users: userCount,
          campaigns: campaignCount,
          pledges: pledgeCount,
          pledgedTotal: pledgedAgg.length > 0 ? pledgedAgg[0].total : 0,
        },
        campaignsByStatus,
        recentPledges: recentPledges.map((p) => ({
          ...publicPledge(p),
          campaignTitle: p.campaign ? p.campaign.title : 'Unknown campaign',
        })),
        recentCampaigns: recentCampaigns.map(formatCampaign),
      },
    });
  })
);

module.exports = router;
