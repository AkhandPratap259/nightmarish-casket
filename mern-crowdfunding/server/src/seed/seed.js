// FundForge demo seed. All campaigns are labelled sample data (isSample)
// for trying the app locally. Pledged totals, backer counts and reward
// claimed counts are computed from the seeded pledges below — never
// hand-typed — so the numbers always agree with the pledge records.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Pledge = require('../models/Pledge');
const Update = require('../models/Update');
const Comment = require('../models/Comment');

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY);

// Each campaign: pledges are {amount, reward (index into rewards, or null), anonymous}.
// comments are {body, anonymousAuthor} — all by the demo backer unless noted.
// updates are {title, body} by the demo creator.
const CAMPAIGNS = [
  {
    title: 'Solar Lanterns for Night Markets',
    tagline: 'Light up the evening stalls, one solar lantern at a time.',
    story:
      'Our night market runs on generator light and candles. We want to build 60 solar lanterns with local makers so every stall has clean, steady light. The lanterns are assembled in the neighbourhood workshop, and every backer gets their name on the stall board.',
    category: 'community',
    goal: 5000,
    endsInDays: 3,
    status: 'live',
    rewards: [
      { title: 'Thank-you shout-out', amount: 25, description: 'Your name on our thank-you board at the night market stall.', quantity: null },
      { title: 'Lantern + name on the stall', amount: 120, description: 'A hand-assembled solar lantern, with your name painted on the stall board.', quantity: 20 },
      { title: 'Founding backer lantern set', amount: 250, description: 'A set of three lanterns and a founding backer card.', quantity: 5 },
    ],
    stretchGoals: [
      { amount: 6000, title: 'Extra lanterns for two more market stalls' },
      { amount: 7500, title: 'A solar charging kiosk for the market' },
    ],
    pledges: [
      { amount: 250, reward: 2, anonymous: false },
      { amount: 250, reward: 2, anonymous: false },
      { amount: 250, reward: 2, anonymous: true },
      { amount: 250, reward: 2, anonymous: false },
      { amount: 250, reward: 2, anonymous: false },
      { amount: 120, reward: 1, anonymous: false },
      { amount: 1500, reward: null, anonymous: false },
      { amount: 1730, reward: null, anonymous: true },
    ],
    comments: [
      { body: 'Will these lanterns work through the monsoon months?' },
      { body: 'Backed the lantern set — looking forward to seeing the stalls lit up.' },
      { body: 'Great to see the workshop involved. How long does one lantern last on a full charge?' },
    ],
    updates: [
      { title: 'First 20 lanterns assembled', body: 'The workshop team has finished the first batch of 20 lanterns and tested each one overnight. They hold a charge for a full evening of trading.' },
      { title: 'Stall layout confirmed', body: 'We have agreed the stall layout with the market committee. Every funded lantern has a named spot, and the thank-you board goes up next week.' },
    ],
  },
  {
    title: 'Open-Source Field Kit for Makers',
    tagline: 'A pocket toolkit and guide for fixing things in the field.',
    story:
      'Too many useful devices are thrown away for want of a screwdriver and a clear guide. This kit packs the essential tools plus an open-source repair manual, so makers can fix phones, fans and small appliances wherever they are.',
    category: 'technology',
    goal: 8000,
    endsInDays: 12,
    status: 'live',
    rewards: [
      { title: 'Digital build guide', amount: 50, description: 'The full repair manual as a downloadable PDF.', quantity: null },
      { title: 'Field kit (basic)', amount: 200, description: 'The pocket toolkit with the essential drivers and bits.', quantity: 50 },
      { title: 'Field kit + workshop seat', amount: 500, description: 'The full kit plus a seat at a hands-on repair workshop.', quantity: 15 },
    ],
    stretchGoals: [{ amount: 10000, title: 'Printed manual in three languages' }],
    pledges: [
      { amount: 1000, reward: 2, anonymous: false },
      { amount: 800, reward: 1, anonymous: false },
      { amount: 600, reward: 1, anonymous: false },
      { amount: 500, reward: 2, anonymous: true },
      { amount: 300, reward: null, anonymous: false },
    ],
    comments: [
      { body: 'Does the basic kit include a spudger for opening phone cases?' },
      { body: 'The workshop seat is a nice touch — will there be an online option too?' },
    ],
    updates: [],
  },
  {
    title: 'Neighbourhood Mural Trail',
    tagline: 'Ten walls, ten local artists, one walkable trail.',
    story:
      'We are turning ten blank walls along the old canal walk into a mural trail painted by local artists. Each wall tells a story from the neighbourhood, and the trail map will be free for everyone to follow.',
    category: 'arts',
    goal: 3000,
    endsInDays: 6,
    status: 'live',
    rewards: [
      { title: 'Trail map + postcard set', amount: 30, description: 'A printed trail map and a set of five mural postcards.', quantity: null },
      { title: 'Guided mural walk for two', amount: 150, description: 'A guided walk of the trail with one of the artists.', quantity: 30 },
      { title: 'Paint a tile on the trail wall', amount: 400, description: 'Paint your own tile into the trail wall under an artist\u2019s guidance.', quantity: 10 },
    ],
    stretchGoals: [],
    pledges: [
      { amount: 750, reward: 2, anonymous: false },
      { amount: 500, reward: 1, anonymous: false },
      { amount: 400, reward: 2, anonymous: false },
      { amount: 300, reward: null, anonymous: false },
    ],
    comments: [
      { body: 'Which artists are painting the canal walls? Would love to see their past work.' },
      { body: 'Backed the guided walk — this trail is exactly what the canal needed.' },
    ],
    updates: [],
  },
  {
    title: 'Community Kitchen: 1,000 Meals',
    tagline: 'A shared kitchen serving 1,000 hot meals to neighbours in need.',
    story:
      'Our community kitchen cooks with donated vegetables and volunteer hands, but the gas, oil and packaging costs add up. This campaign funds 1,000 hot meals over the next two months, served every weekday from the community hall.',
    category: 'food',
    goal: 4000,
    endsInDays: 20,
    status: 'live',
    rewards: [
      { title: 'A meal in your name', amount: 40, description: 'One hot meal served in your name, with a thank-you note from the kitchen.', quantity: null },
      { title: 'Family meal box for a week', amount: 200, description: 'A week of family meal boxes, cooked and packed by the kitchen team.', quantity: 40 },
    ],
    stretchGoals: [],
    pledges: [
      { amount: 400, reward: 1, anonymous: false },
      { amount: 250, reward: null, anonymous: false },
      { amount: 150, reward: 0, anonymous: true },
    ],
    comments: [{ body: 'How are the meals distributed — is there a fixed serving time each day?' }],
    updates: [],
  },
  {
    title: 'Riverbank Cleanup Fleet',
    tagline: 'Boats, nets and volunteers to clear the riverbank, stretch by stretch.',
    story:
      'Plastic and debris collect along the riverbank faster than volunteers can clear it on foot. This fleet of small cleanup boats lets crews reach the worst stretches, haul out waste, and keep a log of what is collected.',
    category: 'environment',
    goal: 6000,
    endsInDays: 9,
    status: 'live',
    rewards: [
      { title: 'Cleanup crew thank-you pack', amount: 50, description: 'A thank-you pack with photos and a report from the first cleanup run.', quantity: null },
      { title: 'Adopt-a-stretch kit', amount: 250, description: 'Adopt a stretch of riverbank: a kit, a named marker, and a cleanup report.', quantity: 25 },
    ],
    stretchGoals: [{ amount: 7500, title: 'A second cleanup boat for the fleet' }],
    pledges: [
      { amount: 1500, reward: 1, anonymous: false },
      { amount: 1200, reward: 1, anonymous: false },
      { amount: 1000, reward: null, anonymous: false },
      { amount: 800, reward: null, anonymous: true },
    ],
    comments: [
      { body: 'What happens to the waste once it is collected — is it sorted for recycling?' },
      { body: 'Great cause. Will volunteers get training before going out on the boats?' },
    ],
    updates: [],
  },
  {
    title: 'Ember Isles — a tabletop game',
    tagline: 'A co-operative island adventure you can finish in one evening.',
    story:
      'Ember Isles is a co-operative tabletop game for 2–4 players. Explore the isles, gather ember, and light the beacons before the tide comes in. This campaign funded the first print run, and the game is now heading to the printers.',
    category: 'games',
    goal: 5000,
    endsInDays: -2,
    status: 'funded',
    rewards: [
      { title: 'Print-and-play edition', amount: 60, description: 'The full game as a print-and-play PDF.', quantity: null },
      { title: 'Deluxe box set', amount: 220, description: 'The deluxe box with wooden pieces and a cloth map.', quantity: 100 },
      { title: 'Deluxe set + playtest credit', amount: 450, description: 'The deluxe box plus your name in the rulebook as a playtester.', quantity: 20 },
    ],
    stretchGoals: [{ amount: 6500, title: 'Foiled cards and a solo mode' }],
    pledges: [
      { amount: 2000, reward: 2, anonymous: false },
      { amount: 1500, reward: 1, anonymous: false },
      { amount: 1000, reward: 1, anonymous: false },
      { amount: 900, reward: null, anonymous: false },
    ],
    comments: [
      { body: 'Funded! When will the deluxe boxes start shipping?' },
      { body: 'Played the print-and-play at a friend\u2019s — the tide mechanic is brilliant.' },
    ],
    updates: [
      { title: 'Funded — thank you', body: 'We reached our goal with two days to spare. Thank you to every backer — the first print run is confirmed.' },
      { title: 'Printing starts next week', body: 'The printer has confirmed the schedule. Deluxe boxes go to press next week, and we will share photos from the factory floor.' },
    ],
  },
  {
    title: 'School Library Rebuild',
    tagline: 'New shelves, new books, and a reading corner for the school.',
    story:
      'The school library lost its roof in last year\u2019s storms, and most of the books were damaged. This campaign aimed to rebuild the shelves and restock 500 books. It did not reach its goal, so pledges were not collected.',
    category: 'education',
    goal: 7000,
    endsInDays: -5,
    status: 'failed',
    rewards: [
      { title: 'Bookplate with your name', amount: 50, description: 'A bookplate with your name inside a new library book.', quantity: null },
      { title: 'Sponsor a shelf', amount: 300, description: 'Sponsor a full shelf of books, with a named plaque.', quantity: 20 },
    ],
    stretchGoals: [],
    pledges: [
      { amount: 800, reward: 1, anonymous: false },
      { amount: 600, reward: null, anonymous: false },
      { amount: 400, reward: 0, anonymous: false },
    ],
    comments: [{ body: 'Sorry this did not fund. Will there be a second attempt with a smaller goal?' }],
    updates: [],
  },
  {
    title: 'Rooftop Garden Co-op',
    tagline: 'A shared rooftop garden growing vegetables for the building.',
    story:
      'We want to turn the building\u2019s empty rooftop into a shared garden: raised beds, a compost corner, and a watering system the whole co-op maintains together. This draft is still being written — the planting plan and costs are being checked with a local gardener.',
    category: 'community',
    goal: 2500,
    endsInDays: 30,
    status: 'draft',
    rewards: [
      { title: 'Seed packet + grow guide', amount: 40, description: 'A seasonal seed packet and a simple grow guide.', quantity: null },
      { title: 'Co-op harvest box', amount: 180, description: 'A weekly harvest box from the garden once it is producing.', quantity: 15 },
    ],
    stretchGoals: [],
    pledges: [],
    comments: [],
    updates: [],
  },
];

async function seed() {
  const existing = await User.countDocuments();
  if (existing > 0) return;

  const hash = await bcrypt.hash('FundForge123!', 10);
  const [demoBacker, demoCreator, admin] = await User.create([
    { name: 'Demo Backer', email: 'demo@fundforge.example', passwordHash: hash, role: 'backer' },
    { name: 'Demo Creator', email: 'demo-creator@fundforge.example', passwordHash: hash, role: 'creator' },
    { name: 'Admin', email: 'admin@fundforge.example', passwordHash: hash, role: 'admin' },
  ]);

  for (const spec of CAMPAIGNS) {
    const campaign = await Campaign.create({
      title: spec.title,
      tagline: spec.tagline,
      story: spec.story,
      category: spec.category,
      goal: spec.goal,
      endsAt: daysFromNow(spec.endsInDays),
      status: spec.status,
      creator: demoCreator._id,
      rewards: spec.rewards.map((r) => ({ ...r, claimed: 0 })),
      stretchGoals: spec.stretchGoals,
      isSample: true,
    });

    // Pledges first; totals and claimed counts are derived from them.
    let pledgedTotal = 0;
    const claimedByReward = new Array(spec.rewards.length).fill(0);
    for (const p of spec.pledges) {
      const reward = p.reward === null || p.reward === undefined ? null : campaign.rewards[p.reward];
      await Pledge.create({
        campaign: campaign._id,
        backer: demoBacker._id,
        amount: p.amount,
        rewardTitle: reward ? reward.title : '',
        rewardId: reward ? reward._id.toString() : '',
        anonymous: Boolean(p.anonymous),
        paymentStatus: 'mock-paid',
      });
      pledgedTotal += p.amount;
      if (reward) claimedByReward[p.reward] += 1;
    }
    campaign.pledgedTotal = pledgedTotal;
    campaign.backerCount = spec.pledges.length;
    spec.rewards.forEach((r, i) => {
      campaign.rewards[i].claimed = claimedByReward[i];
    });
    await campaign.save();

    for (const c of spec.comments) {
      await Comment.create({ campaign: campaign._id, author: demoBacker._id, body: c.body });
    }
    for (const u of spec.updates) {
      await Update.create({ campaign: campaign._id, author: demoCreator._id, title: u.title, body: u.body });
    }
  }

  console.log('Seeded demo users and 8 sample campaigns');
}

module.exports = seed;
