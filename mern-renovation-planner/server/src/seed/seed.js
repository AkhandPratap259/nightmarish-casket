const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Room = require('../models/Room');
const Task = require('../models/Task');
const Material = require('../models/Material');
const Takeoff = require('../models/Takeoff');
const Contractor = require('../models/Contractor');

const DEMO_PASSWORD = 'HomeDraft123!';

async function seed() {
  const existing = await User.countDocuments();
  if (existing > 0) return;

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const homeowner = await User.create({ name: 'Demo Homeowner', email: 'demo@homedraft.example', password: hash, role: 'homeowner' });
  await User.create({ name: 'Demo Contractor', email: 'contractor@homedraft.example', password: hash, role: 'contractor' });
  await User.create({ name: 'Demo Admin', email: 'admin@homedraft.example', password: hash, role: 'admin' });

  const materials = await Material.insertMany([
    { name: 'Emulsion Paint — Interior', category: 'Paint', unit: 'L', unitPrice: 320, coverage: 10, coverageBasis: 'wall', wastePct: 10, isSample: true },
    { name: 'Primer — Wall', category: 'Paint', unit: 'L', unitPrice: 180, coverage: 12, coverageBasis: 'wall', wastePct: 10, isSample: true },
    { name: 'Wall Putty', category: 'Cement & Putty', unit: 'kg', unitPrice: 45, coverage: 4, coverageBasis: 'wall', wastePct: 5, isSample: true },
    { name: 'Ceramic Wall Tiles 2x4 ft', category: 'Tiles', unit: 'sq ft', unitPrice: 85, coverage: 0.0929, coverageBasis: 'wall', wastePct: 10, isSample: true },
    { name: 'Vitrified Floor Tiles 2x2 ft', category: 'Tiles', unit: 'sq ft', unitPrice: 65, coverage: 0.0929, coverageBasis: 'floor', wastePct: 10, isSample: true },
    { name: 'Laminate Flooring', category: 'Flooring', unit: 'sq ft', unitPrice: 145, coverage: 0.0929, coverageBasis: 'floor', wastePct: 8, isSample: true },
    { name: 'BWP Plywood 19mm', category: 'Wood & Ply', unit: 'sq ft', unitPrice: 110, coverage: 0.0929, coverageBasis: 'floor', wastePct: 12, isSample: true },
    { name: 'Cement — 50kg Bag', category: 'Cement & Putty', unit: 'bag', unitPrice: 385, coverage: null, coverageBasis: 'none', wastePct: 0, isSample: true },
    { name: 'Copper Wiring 1.5 sq mm', category: 'Electrical', unit: 'm', unitPrice: 28, coverage: null, coverageBasis: 'none', wastePct: 0, isSample: true },
    { name: 'CPVC Pipe 1 inch', category: 'Plumbing', unit: 'm', unitPrice: 95, coverage: null, coverageBasis: 'none', wastePct: 0, isSample: true },
  ]);
  const matByName = Object.fromEntries(materials.map(m => [m.name, m]));

  const contractors = await Contractor.insertMany([
    { name: 'Ramesh Verma', trade: 'Civil & Masonry', phone: '+91 98765 43210', rating: 4.6, isSample: true },
    { name: 'Sunita Sharma', trade: 'Painting & Finishing', phone: '+91 98765 43211', rating: 4.8, isSample: true },
    { name: 'Imran Khan', trade: 'Electrical & Plumbing', phone: '+91 98765 43212', rating: 4.5, isSample: true },
  ]);

  const p1 = await Project.create({
    owner: homeowner._id, name: 'Kitchen Remodel — 2BHK Flat', propertyType: '2BHK Flat',
    address: 'Flat 402, Sunrise Apartments, Azamgarh', totalBudget: 450000,
    startDate: new Date('2026-11-10'), targetDate: new Date('2027-01-15'), status: 'in-progress', isSample: true,
  });
  const p2 = await Project.create({
    owner: homeowner._id, name: 'Bathroom & Living Refresh', propertyType: '2BHK Flat',
    address: 'Flat 402, Sunrise Apartments, Azamgarh', totalBudget: 275000,
    startDate: new Date('2026-12-01'), targetDate: new Date('2027-02-10'), status: 'planning', isSample: true,
  });

  const kitchen = await Room.create({ project: p1._id, name: 'Kitchen', type: 'Kitchen', length: 3.6, width: 3.0, height: 3, x: 0, y: 0, colour: '#FFD400' });
  const dining = await Room.create({ project: p1._id, name: 'Dining Area', type: 'Dining', length: 4.2, width: 3.4, height: 3, x: 3.6, y: 0, colour: '#2E6BFF' });
  const bath = await Room.create({ project: p2._id, name: 'Bathroom', type: 'Bathroom', length: 2.4, width: 1.8, height: 2.7, x: 0, y: 0, colour: '#FF3B30' });
  const living = await Room.create({ project: p2._id, name: 'Living Room', type: 'Living Room', length: 5.0, width: 4.0, height: 3, x: 2.4, y: 0, colour: '#00C2A8' });

  const demo = await Task.create({ project: p1._id, phase: 'Demolition', title: 'Remove old kitchen counter and tiles', status: 'done', estimatedCost: 18000, actualCost: 17500, dueDate: new Date('2026-11-15'), assignedContractor: contractors[0]._id });
  await Task.create({ project: p1._id, phase: 'Plumbing', title: 'Re-route sink and gas lines', status: 'doing', estimatedCost: 25000, actualCost: 0, dueDate: new Date('2026-11-28'), assignedContractor: contractors[2]._id, dependsOn: demo._id });
  await Task.create({ project: p1._id, phase: 'Electrical', title: 'Add chimney point and extra sockets', status: 'todo', estimatedCost: 12000, actualCost: 0, dueDate: new Date('2026-12-05'), assignedContractor: contractors[2]._id, dependsOn: demo._id });
  await Task.create({ project: p1._id, phase: 'Plaster & Paint', title: 'Putty + two coats emulsion in kitchen', status: 'todo', estimatedCost: 22000, actualCost: 0, dueDate: new Date('2026-12-20') });
  await Task.create({ project: p1._id, phase: 'Flooring', title: 'Lay vitrified floor tiles in kitchen', status: 'todo', estimatedCost: 35000, actualCost: 0, dueDate: new Date('2027-01-05'), assignedContractor: contractors[0]._id });
  await Task.create({ project: p2._id, phase: 'Demolition', title: 'Strip old bathroom fittings', status: 'todo', estimatedCost: 9000, actualCost: 0, dueDate: new Date('2026-12-08') });
  await Task.create({ project: p2._id, phase: 'Plaster & Paint', title: 'Repaint living room walls', status: 'todo', estimatedCost: 18000, actualCost: 0, dueDate: new Date('2027-01-10'), assignedContractor: contractors[1]._id });

  // Sample take-off: kitchen emulsion paint, 2 coats.
  // Wall area = 2*(3.6+3.0)*3 = 39.6 m²; litres = ceil(39.6/10*2*1.10*100)/100 = 8.72 L; cost = round(8.72*320) = ₹2,790
  const paint = matByName['Emulsion Paint — Interior'];
  const wallArea = 2 * (3.6 + 3.0) * 3;
  const qty = Math.ceil((wallArea / paint.coverage) * 2 * (1 + paint.wastePct / 100) * 100) / 100;
  await Takeoff.create({ project: p1._id, room: kitchen._id, material: paint._id, coats: 2, basis: 'wall', areaUsed: wallArea, quantity: qty, unitPrice: paint.unitPrice, totalCost: Math.round(qty * paint.unitPrice) });
  // Sample take-off: kitchen floor tiles. Floor area 10.8 m² = 116.25 sq ft; qty = 116.25/0.0929... coverage is per sq ft so qty in sq ft = 116.25*1.10
  const tiles = matByName['Vitrified Floor Tiles 2x2 ft'];
  const floorSqFt = +(3.6 * 3.0 * 10.7639).toFixed(2);
  const tileQty = Math.ceil(floorSqFt * (1 + tiles.wastePct / 100) * 100) / 100;
  await Takeoff.create({ project: p1._id, room: kitchen._id, material: tiles._id, coats: 1, basis: 'floor', areaUsed: 10.8, quantity: tileQty, unitPrice: tiles.unitPrice, totalCost: Math.round(tileQty * tiles.unitPrice) });

  console.log('Seed data created (sample projects, rooms, tasks, materials, contractors, take-offs).');
}

if (require.main === module) {
  (async () => {
    const mongoose = require('mongoose');
    require('dotenv').config();
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/homedraft');
    await seed();
    await mongoose.disconnect();
    process.exit(0);
  })();
}

module.exports = seed;
