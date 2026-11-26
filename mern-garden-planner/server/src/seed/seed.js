const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Plant = require('../models/Plant');
const Garden = require('../models/Garden');
const Bed = require('../models/Bed');
const Planting = require('../models/Planting');
const Task = require('../models/Task');
const { wateringIntervalDays } = require('../utils/garden');

const DAY = 86400000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);

const PLANTS = [
  { name: 'Tomato', family: 'Solanaceae', category: 'vegetable', daysToMaturity: 75, waterNeed: 2, sun: 'full', spacingCm: 60, season: 'warm', companions: ['Basil', 'Marigold', 'Carrot'], antagonists: ['Cabbage', 'Fennel'], shape: 'circle', colour: 'red', notes: 'Needs a stake or cage once it starts fruiting.' },
  { name: 'Basil', family: 'Lamiaceae', category: 'herb', daysToMaturity: 45, waterNeed: 2, sun: 'full', spacingCm: 25, season: 'warm', companions: ['Tomato', 'Pepper'], antagonists: [], shape: 'semicircle', colour: 'green', notes: 'Pinch the tips to keep it bushy.' },
  { name: 'Marigold', family: 'Asteraceae', category: 'flower', daysToMaturity: 50, waterNeed: 1, sun: 'full', spacingCm: 30, season: 'warm', companions: ['Tomato', 'Cucumber', 'Beans'], antagonists: [], shape: 'circle', colour: 'yellow', notes: 'Its roots discourage soil pests — a classic bed guard.' },
  { name: 'Carrot', family: 'Apiaceae', category: 'vegetable', daysToMaturity: 70, waterNeed: 2, sun: 'full', spacingCm: 8, season: 'cool', companions: ['Onion', 'Tomato', 'Lettuce'], antagonists: ['Dill'], shape: 'triangle', colour: 'red', notes: 'Thin seedlings to 5 cm apart for straight roots.' },
  { name: 'Onion', family: 'Amaryllidaceae', category: 'vegetable', daysToMaturity: 100, waterNeed: 1, sun: 'full', spacingCm: 12, season: 'cool', companions: ['Carrot', 'Lettuce', 'Tomato'], antagonists: ['Beans', 'Peas'], shape: 'circle', colour: 'yellow', notes: 'Stop watering once the tops start to fall over.' },
  { name: 'Lettuce', family: 'Asteraceae', category: 'vegetable', daysToMaturity: 45, waterNeed: 3, sun: 'partial', spacingCm: 25, season: 'cool', companions: ['Carrot', 'Onion', 'Cucumber'], antagonists: [], shape: 'square', colour: 'green', notes: 'Sow little and often for a steady supply.' },
  { name: 'Cucumber', family: 'Cucurbitaceae', category: 'vegetable', daysToMaturity: 55, waterNeed: 3, sun: 'full', spacingCm: 45, season: 'warm', companions: ['Beans', 'Lettuce', 'Marigold'], antagonists: ['Potato'], shape: 'semicircle', colour: 'green', notes: 'Give it a trellis — it climbs happily.' },
  { name: 'Beans', family: 'Fabaceae', category: 'legume', daysToMaturity: 55, waterNeed: 2, sun: 'full', spacingCm: 15, season: 'warm', companions: ['Cucumber', 'Carrot', 'Marigold'], antagonists: ['Onion', 'Garlic'], shape: 'triangle', colour: 'blue', notes: 'Fixes nitrogen, so the bed after beans is richer.' },
  { name: 'Pepper', family: 'Solanaceae', category: 'vegetable', daysToMaturity: 70, waterNeed: 2, sun: 'full', spacingCm: 45, season: 'warm', companions: ['Basil', 'Onion', 'Marigold'], antagonists: ['Fennel'], shape: 'square', colour: 'red', notes: 'Needs steady warmth — no cold nights.' },
  { name: 'Peas', family: 'Fabaceae', category: 'legume', daysToMaturity: 60, waterNeed: 2, sun: 'full', spacingCm: 8, season: 'cool', companions: ['Carrot', 'Cucumber', 'Radish'], antagonists: ['Onion', 'Garlic'], shape: 'circle', colour: 'green', notes: 'Pick often and the plant keeps producing.' },
  { name: 'Radish', family: 'Brassicaceae', category: 'vegetable', daysToMaturity: 28, waterNeed: 2, sun: 'full', spacingCm: 5, season: 'cool', companions: ['Lettuce', 'Peas', 'Cucumber'], antagonists: [], shape: 'circle', colour: 'red', notes: 'One of the fastest crops — ready in about four weeks.' },
  { name: 'Cabbage', family: 'Brassicaceae', category: 'vegetable', daysToMaturity: 90, waterNeed: 2, sun: 'full', spacingCm: 45, season: 'cool', companions: ['Onion', 'Marigold', 'Beans'], antagonists: ['Tomato', 'Fennel'], shape: 'square', colour: 'blue', notes: 'Net it against cabbage white butterflies.' },
  { name: 'Dill', family: 'Apiaceae', category: 'herb', daysToMaturity: 50, waterNeed: 1, sun: 'full', spacingCm: 30, season: 'warm', companions: ['Cabbage', 'Onion'], antagonists: ['Carrot', 'Tomato'], shape: 'triangle', colour: 'yellow', notes: 'Self-seeds freely — let one plant go to seed.' },
  { name: 'Garlic', family: 'Amaryllidaceae', category: 'vegetable', daysToMaturity: 180, waterNeed: 1, sun: 'full', spacingCm: 15, season: 'cool', companions: ['Tomato', 'Lettuce'], antagonists: ['Beans', 'Peas'], shape: 'circle', colour: 'yellow', notes: 'Plant in autumn, harvest in summer.' },
  { name: 'Zucchini', family: 'Cucurbitaceae', category: 'vegetable', daysToMaturity: 50, waterNeed: 3, sun: 'full', spacingCm: 90, season: 'warm', companions: ['Beans', 'Marigold'], antagonists: ['Potato'], shape: 'semicircle', colour: 'green', notes: 'One plant feeds a family — sow sparingly.' },
  { name: 'Spinach', family: 'Asteraceae', category: 'vegetable', daysToMaturity: 40, waterNeed: 3, sun: 'partial', spacingCm: 15, season: 'cool', companions: ['Beans', 'Lettuce', 'Peas'], antagonists: [], shape: 'square', colour: 'green', notes: 'Bolts in heat — sow in the cool season.' },
];

async function seed() {
  const passwordHash = await bcrypt.hash('Sprout123!', 10);
  const [demo, coord, admin] = await User.create([
    { name: 'Demo Gardener', email: 'demo@sproutplot.example', passwordHash, role: 'gardener' },
    { name: 'Maya Coordinator', email: 'coord@sproutplot.example', passwordHash, role: 'coordinator' },
    { name: 'Admin', email: 'admin@sproutplot.example', passwordHash, role: 'admin' },
  ]);

  const plants = await Plant.insertMany(PLANTS);
  const byName = new Map(plants.map((p) => [p.name, p]));

  const garden = await Garden.create({
    name: 'Sunrise Community Garden',
    location: 'Azamgarh, Uttar Pradesh',
    description: 'A shared neighbourhood garden with two orbit rings of raised beds around a central compost hub.',
    coordinator: coord._id,
    members: [coord._id, demo._id],
    rings: 2,
  });

  const beds = await Bed.insertMany([
    { garden: garden._id, name: 'Bed A1', ring: 1, angle: 20, slots: 6, soil: 'compost-rich', sunHours: 7 },
    { garden: garden._id, name: 'Bed A2', ring: 1, angle: 140, slots: 6, soil: 'loam', sunHours: 6 },
    { garden: garden._id, name: 'Bed A3', ring: 1, angle: 260, slots: 6, soil: 'loam', sunHours: 5 },
    { garden: garden._id, name: 'Bed B1', ring: 2, angle: 80, slots: 8, soil: 'sandy', sunHours: 8 },
    { garden: garden._id, name: 'Bed B2', ring: 2, angle: 200, slots: 8, soil: 'clay', sunHours: 6 },
    { garden: garden._id, name: 'Bed B3', ring: 2, angle: 320, slots: 8, soil: 'loam', sunHours: 7 },
  ]);
  const bedByName = new Map(beds.map((b) => [b.name, b]));

  // Sown at staggered dates so stages vary; every bed is harmony-valid.
  const sowings = [
    { bed: 'Bed A1', plant: 'Tomato', qty: 2, ago: 52, wateredAgo: 1 },
    { bed: 'Bed A1', plant: 'Basil', qty: 3, ago: 30, wateredAgo: 1 },
    { bed: 'Bed A1', plant: 'Marigold', qty: 1, ago: 30, wateredAgo: 2 },
    { bed: 'Bed A2', plant: 'Carrot', qty: 4, ago: 40, wateredAgo: 2 },
    { bed: 'Bed A2', plant: 'Onion', qty: 2, ago: 55, wateredAgo: 3 },
    { bed: 'Bed B1', plant: 'Cucumber', qty: 2, ago: 20, wateredAgo: 0 },
    { bed: 'Bed B1', plant: 'Beans', qty: 3, ago: 18, wateredAgo: 1 },
    { bed: 'Bed B2', plant: 'Lettuce', qty: 3, ago: 12, wateredAgo: 0 },
    { bed: 'Bed B2', plant: 'Radish', qty: 4, ago: 6, wateredAgo: 0 },
    { bed: 'Bed B3', plant: 'Pepper', qty: 2, ago: 45, wateredAgo: 4 },
  ];
  const plantings = [];
  for (const s of sowings) {
    const plant = byName.get(s.plant);
    const planting = await Planting.create({
      bed: bedByName.get(s.bed)._id,
      plant: plant._id,
      gardener: demo._id,
      quantity: s.qty,
      sownDate: daysAgo(s.ago),
      lastWatered: s.wateredAgo == null ? null : daysAgo(s.wateredAgo),
    });
    plantings.push({ planting, plant });
  }

  const tasks = [];
  for (const { planting, plant } of plantings) {
    const next = new Date((planting.lastWatered || planting.sownDate).getTime() + wateringIntervalDays(plant) * DAY);
    tasks.push({
      garden: garden._id,
      planting: planting._id,
      bed: planting.bed,
      kind: 'water',
      title: `Water ${plant.name} in ${bedByName.get(beds.find((b) => String(b._id) === String(planting.bed)).name).name}`,
      dueDate: next,
      createdBy: coord._id,
      assignee: demo._id,
    });
  }
  tasks.push({
    garden: garden._id,
    bed: bedByName.get('Bed A3')._id,
    kind: 'weed',
    title: 'Weed Bed A3 before sowing',
    dueDate: daysAgo(-2),
    createdBy: coord._id,
    assignee: demo._id,
  });
  await Task.insertMany(tasks);
}

module.exports = seed;
