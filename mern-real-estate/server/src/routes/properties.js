const express = require('express');
const Property = require('../models/Property');
const SavedSearch = require('../models/SavedSearch');
const Enquiry = require('../models/Enquiry');
const { auth, requireRole } = require('../middleware/auth');
const { emitToUser, emitToAll } = require('../utils/notify');

const router = express.Router();
const TYPES = ['apartment', 'house', 'villa', 'plot', 'commercial'];
const STATUSES = ['available', 'under-offer', 'sold'];

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

function parseAmenities(v) {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function validateProperty(body) {
  const { title, type, city, locality, price, beds, baths, areaSqft, status } = body || {};
  if (!title || !type || !city || !locality) return 'Title, type, city and locality are required';
  if (!TYPES.includes(type)) return `Type must be one of: ${TYPES.join(', ')}`;
  if (status && !STATUSES.includes(status)) return `Status must be one of: ${STATUSES.join(', ')}`;
  const p = Number(price);
  const a = Number(areaSqft);
  if (!Number.isFinite(p) || p <= 0) return 'Price must be a positive number';
  if (!Number.isFinite(a) || a <= 0) return 'Area must be a positive number of square feet';
  if (beds !== undefined && (!Number.isFinite(Number(beds)) || Number(beds) < 0)) return 'Beds must be 0 or more';
  if (baths !== undefined && (!Number.isFinite(Number(baths)) || Number(baths) < 0)) return 'Baths must be 0 or more';
  return null;
}

function matchesSavedSearch(filters, property) {
  if (!filters) return false;
  if (filters.city && filters.city.toLowerCase() !== String(property.city).toLowerCase()) return false;
  if (filters.type && filters.type !== property.type) return false;
  if (filters.minPrice != null && property.price < filters.minPrice) return false;
  if (filters.maxPrice != null && property.price > filters.maxPrice) return false;
  if (filters.minBeds != null && property.beds < filters.minBeds) return false;
  return true;
}

// GET /api/properties — filters, text search, sort, pagination. All server-side.
router.get('/', async (req, res) => {
  const { city, type, minPrice, maxPrice, minBeds, minArea, amenities, status, q, sort, page, limit } = req.query;
  const filter = {};
  if (city) filter.city = new RegExp(`^${city.trim()}$`, 'i');
  if (type && TYPES.includes(type)) filter.type = type;
  if (status && STATUSES.includes(status)) filter.status = status;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined && minPrice !== '') filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined && maxPrice !== '') filter.price.$lte = Number(maxPrice);
  }
  if (minBeds !== undefined && minBeds !== '') filter.beds = { $gte: Number(minBeds) };
  if (minArea !== undefined && minArea !== '') filter.areaSqft = { $gte: Number(minArea) };
  if (amenities) {
    const list = String(amenities).split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length) filter.amenities = { $all: list };
  }
  if (q && q.trim()) filter.$text = { $search: q.trim() };

  let sortSpec = { createdAt: -1 };
  if (sort === 'price-asc') sortSpec = { price: 1 };
  else if (sort === 'price-desc') sortSpec = { price: -1 };
  else if (sort === 'area-desc') sortSpec = { areaSqft: -1 };
  else if (sort === 'newest') sortSpec = { createdAt: -1 };

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 12));
  const total = await Property.countDocuments(filter);
  const docs = await Property.find(filter)
    .populate('agent', 'name email role')
    .sort(sortSpec)
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);
  return res.json({
    properties: docs.map(publicProperty),
    total,
    page: pageNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
  });
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  const p = await Property.findById(req.params.id).populate('agent', 'name email role');
  if (!p) return res.status(404).json({ error: 'Property not found' });
  return res.json({ property: publicProperty(p) });
});

// POST /api/properties — agent or admin only.
router.post('/', auth, requireRole('agent', 'admin'), async (req, res) => {
  const err = validateProperty(req.body);
  if (err) return res.status(400).json({ error: err });
  const { title, type, city, locality, price, beds, baths, areaSqft, status, description } = req.body;
  const property = await Property.create({
    title: title.trim(),
    type,
    city: city.trim(),
    locality: locality.trim(),
    price: Number(price),
    beds: Number(beds) || 0,
    baths: Number(baths) || 0,
    areaSqft: Number(areaSqft),
    amenities: parseAmenities(req.body.amenities),
    status: status || 'available',
    description: (description || '').trim(),
    agent: req.user._id,
  });
  const populated = await Property.findById(property._id).populate('agent', 'name email role');
  const summary = publicProperty(populated);
  emitToAll('property-created', { property: summary });
  // Saved-search matching: notify every user whose saved search matches.
  try {
    const searches = await SavedSearch.find({});
    for (const s of searches) {
      if (matchesSavedSearch(s.filters, summary)) {
        emitToUser(String(s.user), 'saved-search-match', {
          searchName: s.name,
          property: summary,
        });
      }
    }
  } catch (e) {
    console.error('Saved-search matching failed:', e.message);
  }
  return res.status(201).json({ property: summary });
});

// PUT /api/properties/:id — owner agent or admin.
router.put('/:id', auth, requireRole('agent', 'admin'), async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found' });
  const isOwner = String(property.agent) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the listing agent (or an admin) can edit this property' });
  }
  const err = validateProperty({ ...property.toObject(), ...req.body });
  if (err) return res.status(400).json({ error: err });
  const fields = ['title', 'type', 'city', 'locality', 'status', 'description'];
  for (const f of fields) if (req.body[f] !== undefined) property[f] = typeof req.body[f] === 'string' ? req.body[f].trim() : req.body[f];
  for (const f of ['price', 'beds', 'baths', 'areaSqft']) if (req.body[f] !== undefined) property[f] = Number(req.body[f]);
  if (req.body.amenities !== undefined) property.amenities = parseAmenities(req.body.amenities);
  await property.save();
  const populated = await Property.findById(property._id).populate('agent', 'name email role');
  return res.json({ property: publicProperty(populated) });
});

// DELETE /api/properties/:id — owner agent or admin.
router.delete('/:id', auth, requireRole('agent', 'admin'), async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found' });
  const isOwner = String(property.agent) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the listing agent (or an admin) can delete this property' });
  }
  await Enquiry.deleteMany({ property: property._id });
  await property.deleteOne();
  return res.json({ deleted: true });
});

// POST /api/properties/:id/enquiries — any signed-in role.
router.post('/:id/enquiries', auth, async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found' });
  const { message } = req.body || {};
  if (!message || !String(message).trim()) return res.status(400).json({ error: 'A message is required' });
  const enquiry = await Enquiry.create({
    property: property._id,
    from: req.user._id,
    message: String(message).trim(),
  });
  emitToUser(String(property.agent), 'enquiry-received', {
    propertyId: String(property._id),
    propertyTitle: property.title,
    fromName: req.user.name,
    message: enquiry.message,
  });
  return res.status(201).json({
    enquiry: { id: enquiry._id, property: enquiry.property, message: enquiry.message, createdAt: enquiry.createdAt },
  });
});

module.exports = router;
