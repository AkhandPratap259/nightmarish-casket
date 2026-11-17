// Derived campaign fields — computed on read, never stored.
function percentFunded(campaign) {
  if (!campaign || !campaign.goal) return 0;
  return Math.round((campaign.pledgedTotal / campaign.goal) * 100);
}

function daysLeft(campaign) {
  if (!campaign || !campaign.endsAt) return 0;
  const ms = new Date(campaign.endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

// Accepts a Mongoose document or a plain object; returns a plain object
// with the derived fields attached.
function formatCampaign(campaign) {
  const obj = campaign && typeof campaign.toObject === 'function' ? campaign.toObject() : { ...campaign };
  obj.percentFunded = percentFunded(obj);
  obj.daysLeft = daysLeft(obj);
  return obj;
}

// Public pledge shape: never expose the backer's id or email.
function publicPledge(pledge) {
  const obj = pledge && typeof pledge.toObject === 'function' ? pledge.toObject() : { ...pledge };
  const backer = obj.backer;
  const backerName =
    obj.anonymous || !backer ? 'Anonymous' : typeof backer === 'object' ? backer.name : 'Anonymous';
  return {
    id: obj._id,
    amount: obj.amount,
    backerName,
    rewardTitle: obj.rewardTitle || '',
    createdAt: obj.createdAt,
  };
}

module.exports = { percentFunded, daysLeft, formatCampaign, publicPledge };
