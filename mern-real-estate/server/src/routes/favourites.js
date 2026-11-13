const express = require('express');
const Favourite = require('../models/Favourite');
const Property = require('../models/Property');
const { auth } = require('../middleware/auth');

const router = express.Router();

function publicProperty(p) {
  const o = p.toObject ? p.toObject() : p;
  o.id = o._id;
  delete o._id;
  delete o.__v;
  if (o.agent && typeof o.agent === 'object') {
    o.agent = { id: o.agent._id, name: o.agent.name, email: o.agent.email, role: o.agent.role };
  }
  o.pricePerSqft = o.areaSqft > 0 ? Math.round(o.price / o.areaSqft) : null;
  return o;
}

router.get('/', auth, async (req, res) => {
  const favs = await Favourite.find({ user: req.user._id })
    .populate({ path: 'property', populate: { path: 'agent', select: 'name email role' } })
    .sort({ createdAt: -1 });
  const properties = favs.filter((f) => f.property).map((f) => publicProperty(f.property));
  return res.json({ properties });
});

router.post('/:propertyId', auth, async (req, res) => {
  const property = await Property.findById(req.params.propertyId);
  if (!property) return res.status(404).json({ error: 'Property not found' });
  await Favourite.updateOne(
    { user: req.user._id, property: property._id },
    { $setOnInsert: { user: req.user._id, property: property._id } },
    { upsert: true }
  );
  return res.status(201).json({ saved: true });
});

router.delete('/:propertyId', auth, async (req, res) => {
  await Favourite.deleteOne({ user: req.user._id, property: req.params.propertyId });
  return res.json({ saved: false });
});

module.exports = router;
