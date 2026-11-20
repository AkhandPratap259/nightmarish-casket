const Group = require('../models/Group');

// Loads the group from :id and requires the signed-in user to be a member.
// Attaches the group document as req.group.
async function loadGroup(req, res, next) {
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!group.isMember(req.user._id)) {
    return res.status(403).json({ error: 'You are not a member of this group' });
  }
  req.group = group;
  return next();
}

module.exports = { loadGroup };
