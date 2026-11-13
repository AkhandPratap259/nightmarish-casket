// Demo seed data. Everything below is labelled sample data for trying the
// app locally — all listings, localities and prices are sample listings
// created by the demo agent for demonstration. No real properties, owners,
// builders or live prices are listed, and no price is the price of a real
// property or business.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Property = require('../models/Property');

const LISTINGS = [
  {
    title: 'Sunrise 2BHK near the old city',
    type: 'apartment',
    city: 'Azamgarh',
    locality: 'Civil Lines',
    price: 2850000,
    beds: 2,
    baths: 2,
    areaSqft: 980,
    amenities: ['Parking', 'Lift', 'Power backup'],
    status: 'available',
    description: 'Sample listing: a compact 2BHK with a small balcony, close to the market and the college road.',
  },
  {
    title: 'Family house with a front garden',
    type: 'house',
    city: 'Lucknow',
    locality: 'Gomti Nagar',
    price: 7800000,
    beds: 3,
    baths: 2,
    areaSqft: 1650,
    amenities: ['Garden', 'Parking', 'Modular kitchen'],
    status: 'available',
    description: 'Sample listing: a 3BHK independent house with a front garden and a covered car porch.',
  },
  {
    title: 'Riverside 3BHK with a wide balcony',
    type: 'apartment',
    city: 'Varanasi',
    locality: 'Sigra',
    price: 6200000,
    beds: 3,
    baths: 2,
    areaSqft: 1420,
    amenities: ['Lift', 'Power backup', 'Gated security'],
    status: 'under-offer',
    description: 'Sample listing: a bright 3BHK on an upper floor with a wide balcony facing the open side.',
  },
  {
    title: 'Corner villa with a terrace garden',
    type: 'villa',
    city: 'Gorakhpur',
    locality: 'Rapti Nagar',
    price: 12500000,
    beds: 4,
    baths: 3,
    areaSqft: 2600,
    amenities: ['Garden', 'Parking', 'Modular kitchen', 'Gated security'],
    status: 'available',
    description: 'Sample listing: a corner villa with a terrace garden, four bedrooms and a separate study room.',
  },
  {
    title: 'City-centre 1BHK for first buyers',
    type: 'apartment',
    city: 'Delhi',
    locality: 'Rohini',
    price: 5400000,
    beds: 1,
    baths: 1,
    areaSqft: 720,
    amenities: ['Lift', 'Power backup'],
    status: 'available',
    description: 'Sample listing: a compact 1BHK a short walk from the metro line, suited to a first home.',
  },
  {
    title: 'Sea-facing 3BHK, high floor',
    type: 'apartment',
    city: 'Mumbai',
    locality: 'Andheri West',
    price: 24800000,
    beds: 3,
    baths: 3,
    areaSqft: 1580,
    amenities: ['Lift', 'Gym', 'Swimming pool', 'Gated security', 'Power backup'],
    status: 'available',
    description: 'Sample listing: a high-floor 3BHK with a sea-facing balcony and building gym and pool.',
  },
  {
    title: 'Quiet 2BHK near the tech parks',
    type: 'apartment',
    city: 'Bengaluru',
    locality: 'Whitefield',
    price: 8600000,
    beds: 2,
    baths: 2,
    areaSqft: 1180,
    amenities: ['Lift', 'Gym', 'Power backup', 'Gated security'],
    status: 'available',
    description: 'Sample listing: a 2BHK in a gated block near the tech parks, with a small study nook.',
  },
  {
    title: 'Residential plot, ready to build',
    type: 'plot',
    city: 'Pune',
    locality: 'Wagholi',
    price: 4200000,
    beds: 0,
    baths: 0,
    areaSqft: 2400,
    amenities: ['Gated security'],
    status: 'available',
    description: 'Sample listing: a rectangular residential plot with a clear approach road, ready to build on.',
  },
];

async function seed() {
  const count = await User.countDocuments();
  if (count > 0) return;
  const hash = await bcrypt.hash('NestHunt123!', 10);

  const buyer = await User.create({ name: 'Demo Buyer', email: 'demo@nesthunt.example', passwordHash: hash, role: 'buyer' });
  const agent = await User.create({ name: 'Demo Agent', email: 'demo-agent@nesthunt.example', passwordHash: hash, role: 'agent' });
  const admin = await User.create({ name: 'Demo Admin', email: 'admin@nesthunt.example', passwordHash: hash, role: 'admin' });

  for (const listing of LISTINGS) {
    await Property.create({ ...listing, agent: agent._id, demo: true });
  }

  console.log('Seeded NestHunt demo data (demo@nesthunt.example / demo-agent@nesthunt.example / admin@nesthunt.example: NestHunt123!)');
  return { buyer, agent, admin };
}

module.exports = seed;
