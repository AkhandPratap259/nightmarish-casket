const express = require('express');
const Property = require('../models/Property');

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

// GET /api/compare?ids=id1,id2,id3 — max 3. Server-computed summary.
router.get('/', async (req, res) => {
  const raw = String(req.query.ids || '');
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length < 2) return res.status(400).json({ error: 'Pick at least 2 properties to compare' });
  if (ids.length > 3) return res.status(400).json({ error: 'You can compare at most 3 properties' });
  const docs = await Property.find({ _id: { $in: ids } }).populate('agent', 'name email role');
  if (docs.length < 2) return res.status(404).json({ error: 'Not enough of those properties exist' });
  const props = docs.map(publicProperty);
  const byId = (p) => String(p.id);
  const cheapest = props.reduce((a, b) => (b.price < a.price ? b : a));
  const largest = props.reduce((a, b) => (b.areaSqft > a.areaSqft ? b : a));
  const bestValue = props.reduce((a, b) => ((b.pricePerSqft || Infinity) < (a.pricePerSqft || Infinity) ? b : a));
  const mostBeds = props.reduce((a, b) => (b.beds > a.beds ? b : a));
  return res.json({
    properties: props,
    summary: {
      cheapestId: byId(cheapest),
      largestAreaId: byId(largest),
      bestValueId: byId(bestValue),
      mostBedsId: byId(mostBeds),
    },
  });
});

module.exports = router;
