// TaskTrove seed data — fixed demo catalogue, providers and bookings.
// Every number here is demo data: completed-job counts, ratings and
// response rates all derive from these seeded bookings and reviews, and
// the match-score engine reads them live. Nothing is invented at runtime.
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const Service = require('../models/Service');
const Offering = require('../models/Offering');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { computePriceBreakdown } = require('../utils/pricing');

const PASSWORD = 'TaskTrove123!';

const SERVICES = [
  { name: 'Deep Home Cleaning', category: 'Home Cleaning', description: 'Full-home deep clean: floors, bathrooms, kitchen surfaces, fans and windows.', basePrice: 1499, durationMin: 180, icon: 'sparkle' },
  { name: 'Kitchen Deep Cleaning', category: 'Home Cleaning', description: 'Degreasing, chimney and hob cleaning, cabinets inside and out, sink descaling.', basePrice: 1199, durationMin: 120, icon: 'sparkle' },
  { name: 'Sofa & Carpet Cleaning', category: 'Home Cleaning', description: 'Shampoo wash for sofas and carpets with stain treatment and drying.', basePrice: 899, durationMin: 90, icon: 'sparkle' },
  { name: 'Tap & Faucet Repair', category: 'Plumbing', description: 'Leaking taps, washers, cartridges and fitting replacement.', basePrice: 349, durationMin: 45, icon: 'drop' },
  { name: 'Drain Unblocking', category: 'Plumbing', description: 'Blocked kitchen, bathroom and floor drains cleared with proper tools.', basePrice: 449, durationMin: 60, icon: 'drop' },
  { name: 'Switch & Socket Repair', category: 'Electrical', description: 'Faulty switches, sockets and loose connections repaired safely.', basePrice: 299, durationMin: 45, icon: 'bolt' },
  { name: 'Ceiling Fan Installation', category: 'Electrical', description: 'New ceiling fan fitting, balancing and speed-control check.', basePrice: 399, durationMin: 60, icon: 'bolt' },
  { name: 'Inverter & Wiring Check', category: 'Electrical', description: 'Inverter health check, battery terminals and a full wiring safety audit.', basePrice: 799, durationMin: 90, icon: 'bolt' },
  { name: 'AC Service & Repair', category: 'Appliance Repair', description: 'Split and window AC service: filter clean, gas check and cooling test.', basePrice: 649, durationMin: 90, icon: 'snow' },
  { name: 'Washing Machine Repair', category: 'Appliance Repair', description: 'Drum, drain, spin and noise faults diagnosed and repaired at home.', basePrice: 549, durationMin: 90, icon: 'gear' },
  { name: 'Haircut & Styling at Home', category: 'Beauty & Salon', description: 'Haircut and styling at your home with sanitised tools and cleanup.', basePrice: 499, durationMin: 60, icon: 'scissors' },
  { name: 'Facial & Cleanup at Home', category: 'Beauty & Salon', description: 'Relaxing facial and skin cleanup with products suited to your skin type.', basePrice: 799, durationMin: 75, icon: 'scissors' },
  { name: 'Maths Tutoring — Class 10', category: 'Tutoring', description: 'One-to-one maths tutoring for Class 10: algebra, geometry and exam practice.', basePrice: 400, durationMin: 60, icon: 'book' },
  { name: 'English Tutoring — Class 8', category: 'Tutoring', description: 'One-to-one English tutoring for Class 8: grammar, reading and writing.', basePrice: 350, durationMin: 60, icon: 'book' },
];

const PROVIDERS = [
  {
    name: 'Ramesh Kumar', email: 'demo-provider@tasktrove.example',
    bio: 'Home cleaning and plumbing professional with 8 years of experience across Azamgarh households.',
    yearsExperience: 8, city: 'Azamgarh', phone: '9876500001', avatarColor: '#e8501a',
    offerings: [
      { service: 'Deep Home Cleaning', price: 1399, durationMin: 180, areas: ['Azamgarh', 'Civil Lines', 'Jiyanpur'] },
      { service: 'Kitchen Deep Cleaning', price: 1099, durationMin: 120, areas: ['Azamgarh', 'Civil Lines', 'Mubarakpur'] },
      { service: 'Sofa & Carpet Cleaning', price: 849, durationMin: 90, areas: ['Azamgarh', 'Civil Lines'] },
      { service: 'Tap & Faucet Repair', price: 329, durationMin: 45, areas: ['Azamgarh', 'Civil Lines', 'Jiyanpur', 'Phoolpur'] },
      { service: 'Drain Unblocking', price: 429, durationMin: 60, areas: ['Azamgarh', 'Civil Lines', 'Saraimeer'] },
    ],
  },
  {
    name: 'Sunita Yadav', email: 'sunita@tasktrove.example',
    bio: 'Beautician and home-care specialist offering salon services at your doorstep.',
    yearsExperience: 6, city: 'Civil Lines', phone: '9876500002', avatarColor: '#1f5c4d',
    offerings: [
      { service: 'Haircut & Styling at Home', price: 449, durationMin: 60, areas: ['Azamgarh', 'Civil Lines', 'Jiyanpur'] },
      { service: 'Facial & Cleanup at Home', price: 749, durationMin: 75, areas: ['Azamgarh', 'Civil Lines'] },
      { service: 'Sofa & Carpet Cleaning', price: 879, durationMin: 90, areas: ['Civil Lines', 'Jiyanpur'] },
    ],
  },
  {
    name: 'Imran Ansari', email: 'imran@tasktrove.example',
    bio: 'Licensed electrician for home wiring, fittings and appliance connections.',
    yearsExperience: 10, city: 'Azamgarh', phone: '9876500003', avatarColor: '#27408b',
    offerings: [
      { service: 'Switch & Socket Repair', price: 279, durationMin: 45, areas: ['Azamgarh', 'Civil Lines', 'Nizamabad'] },
      { service: 'Ceiling Fan Installation', price: 379, durationMin: 60, areas: ['Azamgarh', 'Civil Lines', 'Atraulia'] },
      { service: 'Inverter & Wiring Check', price: 749, durationMin: 90, areas: ['Azamgarh', 'Civil Lines'] },
      { service: 'AC Service & Repair', price: 629, durationMin: 90, areas: ['Azamgarh', 'Civil Lines', 'Bilariaganj'] },
    ],
  },
  {
    name: 'Vikram Singh', email: 'vikram@tasktrove.example',
    bio: 'Appliance technician: AC, washing machines and home electrical fittings.',
    yearsExperience: 7, city: 'Jiyanpur', phone: '9876500004', avatarColor: '#7a4a21',
    offerings: [
      { service: 'AC Service & Repair', price: 599, durationMin: 90, areas: ['Azamgarh', 'Jiyanpur', 'Mubarakpur'] },
      { service: 'Washing Machine Repair', price: 499, durationMin: 90, areas: ['Azamgarh', 'Jiyanpur', 'Civil Lines'] },
      { service: 'Inverter & Wiring Check', price: 699, durationMin: 90, areas: ['Jiyanpur', 'Azamgarh'] },
      { service: 'Ceiling Fan Installation', price: 389, durationMin: 60, areas: ['Jiyanpur', 'Azamgarh', 'Phoolpur'] },
    ],
  },
  {
    name: 'Neha Sharma', email: 'neha@tasktrove.example',
    bio: 'School tutor for maths and English, Classes 8–10, with weekly progress notes for parents.',
    yearsExperience: 5, city: 'Civil Lines', phone: '9876500005', avatarColor: '#e8501a',
    offerings: [
      { service: 'Maths Tutoring — Class 10', price: 350, durationMin: 60, areas: ['Azamgarh', 'Civil Lines', 'Jiyanpur'] },
      { service: 'English Tutoring — Class 8', price: 300, durationMin: 60, areas: ['Azamgarh', 'Civil Lines'] },
    ],
  },
];

function daysFromNow(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const admin = await User.create({
    name: 'TaskTrove Admin', email: 'admin@tasktrove.example', passwordHash,
    role: 'admin', city: 'Azamgarh', avatarColor: '#1a1a18',
  });
  const demoCustomer = await User.create({
    name: 'Aarav Verma', email: 'demo@tasktrove.example', passwordHash,
    role: 'customer', city: 'Azamgarh', phone: '9876500010', avatarColor: '#e8501a',
  });
  const priya = await User.create({
    name: 'Priya Singh', email: 'priya@tasktrove.example', passwordHash,
    role: 'customer', city: 'Civil Lines', phone: '9876500011', avatarColor: '#1f5c4d',
  });
  const arjun = await User.create({
    name: 'Arjun Patel', email: 'arjun@tasktrove.example', passwordHash,
    role: 'customer', city: 'Jiyanpur', phone: '9876500012', avatarColor: '#27408b',
  });

  const providerUsers = {};
  for (const p of PROVIDERS) {
    providerUsers[p.name] = await User.create({
      name: p.name, email: p.email, passwordHash, role: 'provider',
      city: p.city, phone: p.phone, bio: p.bio,
      yearsExperience: p.yearsExperience, avatarColor: p.avatarColor,
    });
  }

  const services = await Service.insertMany(SERVICES);
  const serviceByName = Object.fromEntries(services.map((s) => [s.name, s]));

  const offeringByKey = {};
  for (const p of PROVIDERS) {
    for (const o of p.offerings) {
      const created = await Offering.create({
        provider: providerUsers[p.name]._id,
        service: serviceByName[o.service]._id,
        price: o.price,
        durationMin: o.durationMin,
        areas: o.areas,
        bio: p.bio,
      });
      offeringByKey[`${p.name}|${o.service}`] = created;
    }
  }

  // Seeded bookings: dates are relative to seed day so the demo always has
  // past completed jobs (with reviews), one job in progress today, and
  // upcoming accepted/requested jobs.
  const plan = [
    { customer: demoCustomer, key: 'Ramesh Kumar|Deep Home Cleaning', offset: -3, slot: '10:00', status: 'completed', area: 'Azamgarh', address: '12, Civil Lines, Azamgarh', review: { rating: 5, comment: 'Thorough cleaning, arrived on time and very polite.' } },
    { customer: priya, key: 'Sunita Yadav|Haircut & Styling at Home', offset: -2, slot: '17:00', status: 'completed', area: 'Civil Lines', address: '45, Civil Lines, Azamgarh', review: { rating: 5, comment: 'Great haircut at home, neat and professional.' } },
    { customer: arjun, key: 'Imran Ansari|Switch & Socket Repair', offset: -4, slot: '11:00', status: 'completed', area: 'Jiyanpur', address: '8, Jiyanpur, Azamgarh', review: { rating: 4, comment: 'Fixed both switches quickly. Would book again.' } },
    { customer: demoCustomer, key: 'Vikram Singh|AC Service & Repair', offset: -5, slot: '09:00', status: 'completed', area: 'Azamgarh', address: '12, Civil Lines, Azamgarh', review: { rating: 5, comment: 'AC cooling is back to normal. Good service.' } },
    { customer: priya, key: 'Neha Sharma|Maths Tutoring — Class 10', offset: -1, slot: '16:00', status: 'completed', area: 'Civil Lines', address: '45, Civil Lines, Azamgarh', review: { rating: 5, comment: 'My daughter understood algebra finally. Patient teacher.' } },
    { customer: priya, key: 'Vikram Singh|Washing Machine Repair', offset: -6, slot: '12:00', status: 'completed', area: 'Civil Lines', address: '45, Civil Lines, Azamgarh', review: { rating: 4, comment: 'Machine works fine now. Fair price.' } },
    { customer: priya, key: 'Ramesh Kumar|Tap & Faucet Repair', offset: 0, slot: '09:00', status: 'in_progress', area: 'Civil Lines', address: '45, Civil Lines, Azamgarh' },
    { customer: demoCustomer, key: 'Ramesh Kumar|Kitchen Deep Cleaning', offset: 1, slot: '10:00', status: 'accepted', area: 'Azamgarh', address: '12, Civil Lines, Azamgarh' },
    { customer: arjun, key: 'Imran Ansari|Ceiling Fan Installation', offset: 1, slot: '14:00', status: 'requested', area: 'Jiyanpur', address: '8, Jiyanpur, Azamgarh' },
    { customer: demoCustomer, key: 'Sunita Yadav|Facial & Cleanup at Home', offset: -7, slot: '15:00', status: 'declined', area: 'Azamgarh', address: '12, Civil Lines, Azamgarh' },
  ];

  for (const item of plan) {
    const offering = offeringByKey[item.key];
    const svc = await Service.findById(offering.service).lean();
    const date = daysFromNow(item.offset);
    const breakdown = computePriceBreakdown(offering.price, date, item.slot);
    const timeline = [{ status: 'requested', at: new Date(Date.now() + item.offset * 86400000) }];
    const flow = ['requested', 'accepted', 'in_progress', 'completed'];
    const targetIndex = flow.indexOf(item.status);
    if (targetIndex > 0) {
      for (let i = 1; i <= targetIndex; i += 1) {
        timeline.push({ status: flow[i], at: new Date(Date.now() + item.offset * 86400000 + i * 3600000) });
      }
    } else if (item.status === 'declined') {
      timeline.push({ status: 'declined', at: new Date(Date.now() + item.offset * 86400000 + 3600000) });
    }
    const booking = await Booking.create({
      customer: item.customer._id,
      provider: offering.provider,
      offering: offering._id,
      serviceName: svc.name,
      serviceCategory: svc.category,
      date,
      slot: item.slot,
      address: item.address,
      area: item.area,
      notes: '',
      status: item.status,
      priceBreakdown: {
        base: breakdown.base,
        peakSurcharge: breakdown.peakSurcharge,
        platformFee: breakdown.platformFee,
        gst: breakdown.gst,
        total: breakdown.total,
      },
      timeline,
    });
    if (item.review) {
      await Review.create({
        booking: booking._id,
        customer: item.customer._id,
        provider: offering.provider,
        offering: offering._id,
        rating: item.review.rating,
        comment: item.review.comment,
      });
    }
  }

  return { admin, demoCustomer };
}

async function main() {
  let uri = process.env.MONGO_URI;
  let mongod = null;
  if (!uri) {
    const isWindowsArm = process.platform === 'win32' && process.arch === 'arm64';
    mongod = await MongoMemoryServer.create({
      binary: isWindowsArm ? { arch: 'x64' } : {},
      instance: { launchTimeout: 60000 },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri, { dbName: 'tasktrove' });
  await Promise.all([User.init(), Service.init(), Offering.init(), Booking.init(), Review.init()]);
  await Promise.all([
    User.deleteMany({}),
    Service.deleteMany({}),
    Offering.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
  ]);
  await seed();
  const counts = {
    users: await User.countDocuments(),
    services: await Service.countDocuments(),
    offerings: await Offering.countDocuments(),
    bookings: await Booking.countDocuments(),
    reviews: await Review.countDocuments(),
  };
  console.log('TaskTrove seeded:', counts);
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seed;
