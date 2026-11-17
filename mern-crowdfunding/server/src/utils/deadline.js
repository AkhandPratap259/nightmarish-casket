const Campaign = require('../models/Campaign');

// Close every live campaign whose deadline has passed: funded when the
// pledged total reached the goal, failed otherwise. Runs once at startup
// and every 60 seconds from server.js.
async function closeDeadlines() {
  const now = new Date();
  const due = await Campaign.find({ status: 'live', endsAt: { $lt: now } });
  for (const campaign of due) {
    const nextStatus = campaign.pledgedTotal >= campaign.goal ? 'funded' : 'failed';
    campaign.status = nextStatus;
    await campaign.save();
    console.log(
      `Closed campaign "${campaign.title}" (${campaign._id}) as ${nextStatus} — pledged ${campaign.pledgedTotal} of goal ${campaign.goal}`
    );
  }
  return due.length;
}

module.exports = { closeDeadlines };
