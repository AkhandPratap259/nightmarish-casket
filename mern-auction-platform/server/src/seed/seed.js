// Demo seed data. Everything below is labelled sample data for trying the
// app locally — all lots, sellers, bidders and prices are sample listings
// created for demonstration. No real items, sellers or live prices are
// listed, and no price is the price of a real item or business.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

const LOTS = [
  {
    title: 'Vintage HMT Janata hand-wound watch',
    description:
      'Sample listing: a 1970s-style HMT Janata with a cream dial, serviced movement and a new leather strap. Keeps time well for its age.',
    category: 'watches',
    condition: 'vintage',
    city: 'Azamgarh',
    startingBid: 2500,
    minIncrement: 100,
    endsIn: 95 * MIN,
    bids: [2600, 2900, 3200, 3500, 3800, 4100],
  },
  {
    title: 'Retro 35mm film camera with 50mm lens',
    description:
      'Sample listing: a fully mechanical 35mm camera, shutter speeds tested, light seals replaced, with a 50mm f/2 lens and a carry case.',
    category: 'vintage',
    condition: 'used',
    city: 'Lucknow',
    startingBid: 6000,
    minIncrement: 250,
    endsIn: 28 * MIN,
    bids: [6250, 7000, 7500, 8000],
  },
  {
    title: 'Handwoven Banarasi silk saree, zari border',
    description:
      'Sample listing: a handwoven silk saree in deep maroon with a gold zari border, woven by a family workshop. Includes a matching blouse piece.',
    category: 'home',
    condition: 'new',
    city: 'Varanasi',
    startingBid: 4500,
    minIncrement: 200,
    endsIn: 3 * HOUR,
    bids: [4700, 5000, 5400],
  },
  {
    title: 'Custom mechanical keyboard, hot-swappable',
    description:
      'Sample listing: a 75% aluminium keyboard with lubed linear switches, PBT keycaps and a coiled cable. Built and tested by the seller.',
    category: 'tech',
    condition: 'like-new',
    city: 'Bengaluru',
    startingBid: 5500,
    minIncrement: 250,
    endsIn: 26 * HOUR,
    bids: [5750, 6200],
  },
  {
    title: 'First-edition hardcover classics, set of five',
    description:
      'Sample listing: five hardcover classics in matching cloth binding — good spines, light foxing on two endpapers, from one private shelf.',
    category: 'collectibles',
    condition: 'used',
    city: 'Delhi',
    startingBid: 3000,
    minIncrement: 100,
    endsIn: 2 * 24 * HOUR,
    bids: [3100, 3400, 3600, 3900, 4200, 4500, 4800],
  },
  {
    title: 'Limited-run court sneakers, UK 9, unworn',
    description:
      'Sample listing: a limited-run pair in UK 9, unworn with the original box and spare laces. Box has light shelf wear on one corner.',
    category: 'sneakers',
    condition: 'new',
    city: 'Mumbai',
    startingBid: 8000,
    minIncrement: 500,
    endsIn: 4 * 24 * HOUR,
    bids: [8500, 9000, 9800, 10500],
  },
  {
    title: 'Brass temple lamp, hand-cast, pair',
    description:
      'Sample listing: a pair of hand-cast brass lamps with a warm patina, cleaned and polished. Each stands about 30 cm tall.',
    category: 'home',
    condition: 'vintage',
    city: 'Gorakhpur',
    startingBid: 1800,
    minIncrement: 100,
    endsIn: 5 * HOUR,
    bids: [1900, 2100],
  },
  {
    title: 'Cricket bat, signed print edition',
    description:
      'Sample listing: a full-size Kashmir willow bat with a printed signature panel and a display stand. A display piece, not match-used.',
    category: 'memorabilia',
    condition: 'new',
    city: 'Pune',
    startingBid: 2200,
    minIncrement: 100,
    endsIn: -2 * HOUR,
    bids: [2300, 2500, 2800, 3100],
    ended: true,
  },
];

async function seed() {
  const existing = await Auction.countDocuments();
  if (existing > 0) return;

  const hash = await bcrypt.hash('BidSphere123!', 10);
  const [demoBidder, demoSeller, admin, aarav, meera] = await User.create([
    { name: 'Demo Bidder', email: 'demo@bidsphere.example', passwordHash: hash, role: 'bidder' },
    { name: 'Demo Seller', email: 'demo-seller@bidsphere.example', passwordHash: hash, role: 'seller' },
    { name: 'Admin', email: 'admin@bidsphere.example', passwordHash: hash, role: 'admin' },
    { name: 'Aarav (sample bidder)', email: 'aarav@bidsphere.example', passwordHash: hash, role: 'bidder' },
    { name: 'Meera (sample bidder)', email: 'meera@bidsphere.example', passwordHash: hash, role: 'bidder' },
  ]);
  const bidders = [demoBidder, aarav, meera];

  const now = Date.now();
  for (const lot of LOTS) {
    const endsAt = new Date(now + lot.endsIn);
    const auction = await Auction.create({
      title: lot.title,
      description: lot.description,
      category: lot.category,
      condition: lot.condition,
      city: lot.city,
      startingBid: lot.startingBid,
      minIncrement: lot.minIncrement,
      currentBid: lot.bids[lot.bids.length - 1],
      bidsCount: lot.bids.length,
      seller: demoSeller._id,
      status: lot.ended ? 'ended' : 'live',
      endsAt,
      winner: lot.ended ? bidders[lot.bids.length % bidders.length]._id : null,
      winningBid: lot.ended ? lot.bids[lot.bids.length - 1] : null,
    });
    // Spread the bid history backwards from the end time so the feed reads
    // like a real auction that has been running for a while.
    for (let i = 0; i < lot.bids.length; i += 1) {
      await Bid.create({
        auction: auction._id,
        bidder: bidders[i % bidders.length]._id,
        amount: lot.bids[i],
        createdAt: new Date(endsAt.getTime() - (lot.bids.length - i) * 17 * MIN),
      });
    }
  }
  console.log('Seeded demo users and sample lots');
}

module.exports = seed;
