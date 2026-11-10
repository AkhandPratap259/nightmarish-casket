// Demo seed data. Every event, person and booking below is labelled demo
// data for trying the app locally — all events, venues and artists are
// fictional; no real artists, venues or real-world events are listed.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Waitlist = require('../models/Waitlist');
const { zonesWithPrices, allSeats } = require('../utils/seats');

const EVENTS = [
  {
    title: 'Neon Strings Live',
    category: 'Music',
    city: 'Azamgarh',
    venue: 'Riverside Open Ground',
    description:
      'A fictional open-air night of indie and acoustic sets under string lights, with three local demo bands and a closing unplugged hour.',
    date: new Date('2026-11-28T13:30:00.000Z'), // 19:00 IST
    durationMinutes: 240,
    zones: zonesWithPrices(1499, 899, 499),
  },
  {
    title: 'CodeSprint Summit 2026',
    category: 'Tech',
    city: 'Bengaluru',
    venue: 'Halli Convention Centre',
    description:
      'A fictional one-day tech conference: talks on building for the web, a live hackathon final, and a demo floor for student projects.',
    date: new Date('2026-12-05T03:30:00.000Z'), // 09:00 IST
    durationMinutes: 480,
    zones: zonesWithPrices(2499, 1499, 799),
  },
  {
    title: 'Laugh Riot Night',
    category: 'Comedy',
    city: 'Lucknow',
    venue: 'Gomti Amphitheatre',
    description:
      'A fictional stand-up comedy night: four demo comics, one mic, and an open-mic slot for the bravest audience member.',
    date: new Date('2026-12-12T14:00:00.000Z'), // 19:30 IST
    durationMinutes: 150,
    zones: zonesWithPrices(999, 599, 299),
  },
  {
    title: 'The Winter Rehearsal',
    category: 'Theatre',
    city: 'Delhi',
    venue: 'Old Mill Playhouse',
    description:
      'A fictional two-act play about a travelling theatre troupe that loses its script on opening night — and improvises the whole show.',
    date: new Date('2026-11-29T12:30:00.000Z'), // 18:00 IST
    durationMinutes: 150,
    zones: zonesWithPrices(1199, 749, 399),
  },
  {
    title: 'Cricket League Final — Big Screen Night',
    category: 'Sports',
    city: 'Mumbai',
    venue: 'Seaside Fan Park',
    description:
      'A fictional city cricket-league final on the big screen: food stalls, fan chants, and a post-match quiz for the loudest stand.',
    date: new Date('2026-12-20T13:00:00.000Z'), // 18:30 IST
    durationMinutes: 300,
    zones: zonesWithPrices(799, 499, 249),
  },
  {
    title: 'Purvanchal Food & Folk Utsav',
    category: 'Food & Culture',
    city: 'Varanasi',
    venue: 'Ghatside Cultural Ground',
    description:
      'A fictional food and folk festival: street-food counters, folk dance and music through the evening, and a craft bazaar.',
    date: new Date('2026-12-26T10:30:00.000Z'), // 16:00 IST
    durationMinutes: 300,
    zones: zonesWithPrices(599, 349, 149),
  },
];

function ticketCode(tag, seatId) {
  // Deterministic demo codes for seeded bookings (real bookings get
  // random codes at confirm time). The tag keeps codes unique per event.
  return `GT-${tag}${seatId}`;
}

async function seed() {
  const count = await User.countDocuments();
  if (count > 0) return;
  const hash = await bcrypt.hash('Gatherly123!', 10);

  const admin = await User.create({
    name: 'Platform Admin',
    email: 'admin@gatherly.example',
    passwordHash: hash,
    role: 'admin',
  });
  const attendee = await User.create({
    name: 'Demo Attendee',
    email: 'demo@gatherly.example',
    passwordHash: hash,
    role: 'attendee',
    phone: '98765 43210',
  });
  const organizer = await User.create({
    name: 'Demo Organizer',
    email: 'demo-organizer@gatherly.example',
    passwordHash: hash,
    role: 'organizer',
    phone: '98765 43211',
  });
  const waitlistUser = await User.create({
    name: 'Demo Waitlist Guest',
    email: 'waitlist@gatherly.example',
    passwordHash: hash,
    role: 'attendee',
  });

  const events = [];
  for (const e of EVENTS) {
    events.push(await Event.create({ ...e, organizer: organizer._id, demo: true }));
  }

  const priceOf = (event, seatId) => {
    for (const zone of event.zones) {
      for (const row of zone.rows) {
        if (row.label === seatId[0]) return zone.price;
      }
    }
    return 0;
  };

  // A few confirmed demo bookings so the organizer and admin views are
  // not empty: VIP seats at the music night, standard seats at the summit.
  const music = events[0];
  const musicSeats = ['A1', 'A2', 'A3', 'A4'];
  await Booking.create({
    event: music._id,
    user: attendee._id,
    seats: musicSeats,
    status: 'confirmed',
    totalAmount: musicSeats.reduce((n, s) => n + priceOf(music, s), 0),
    paymentMethod: 'demo',
    tickets: musicSeats.map((s) => ({ seatId: s, code: ticketCode('MU', s), checkedIn: false })),
  });
  const summit = events[1];
  const summitSeats = ['F1', 'F2'];
  await Booking.create({
    event: summit._id,
    user: attendee._id,
    seats: summitSeats,
    status: 'confirmed',
    totalAmount: summitSeats.reduce((n, s) => n + priceOf(summit, s), 0),
    paymentMethod: 'demo',
    tickets: summitSeats.map((s) => ({ seatId: s, code: ticketCode('SU', s), checkedIn: false })),
  });

  // The food festival is sold out in the seed: every seat is booked in
  // chunks of six, so the waitlist path can be tried straight away.
  const festival = events[5];
  const all = allSeats(festival).map((s) => s.id);
  for (let i = 0; i < all.length; i += 6) {
    const chunk = all.slice(i, i + 6);
    await Booking.create({
      event: festival._id,
      user: attendee._id,
      seats: chunk,
      status: 'confirmed',
      totalAmount: chunk.reduce((n, s) => n + priceOf(festival, s), 0),
      paymentMethod: 'demo',
      tickets: chunk.map((s) => ({ seatId: s, code: ticketCode('FE', s), checkedIn: false })),
    });
  }
  await Waitlist.create({ user: waitlistUser._id, event: festival._id, status: 'waiting' });

  console.log('Seeded Gatherly demo data (admin / demo attendee / demo organizer: Gatherly123!)');
  return { admin, attendee, organizer };
}

module.exports = seed;
