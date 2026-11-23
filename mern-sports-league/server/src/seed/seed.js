// PlayPulse seed data — fixed demo users, two demo leagues with squads, a
// full round-robin season for each, finished matchweeks with goal events,
// and one live match so the match centre shows live data on first run.
// All names, scores and dates here are demo data for local testing only.
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const League = require('../models/League');
const Team = require('../models/Team');
const Match = require('../models/Match');
const { roundRobin, fixtureDates } = require('../utils/fixtures');

const PASSWORD = 'PlayPulse123!';

const DEMO_USERS = [
  { name: 'Asha Organizer', email: 'demo@playpulse.example', role: 'organizer' },
  { name: 'Rohan Captain', email: 'captain@playpulse.example', role: 'captain' },
  { name: 'Meera Fan', email: 'fan@playpulse.example', role: 'fan' },
  { name: 'PlayPulse Admin', email: 'admin@playpulse.example', role: 'admin' },
];

function squad(names) {
  const positions = ['GK', 'DF', 'DF', 'MF', 'MF', 'FW', 'FW'];
  return names.map((name, i) => ({ name, position: positions[i % positions.length], number: [1, 4, 5, 8, 10, 9, 11][i % 7] }));
}

const FOOTBALL_TEAMS = [
  { name: 'Azamgarh Avengers', shortName: 'AZA', colour: 'pink', players: squad(['Arjun Yadav', 'Vikram Singh', 'Sahil Khan', 'Dev Patel', 'Kabir Rao', 'Nikhil Verma', 'Ayaan Ali']) },
  { name: 'Riverside Rovers', shortName: 'RVR', colour: 'sky', players: squad(['Rahul Sharma', 'Amit Gupta', 'Karan Mehta', 'Rohan Das', 'Sanjay Nair', 'Imran Sheikh', 'Tarun Joshi']) },
  { name: 'College XI', shortName: 'CXI', colour: 'mint', players: squad(['Ankit Tiwari', 'Priya Nair', 'Neha Singh', 'Vivek Anand', 'Manish Kumar', 'Sara Qureshi', 'Deepak Yadav']) },
  { name: 'Old Town United', shortName: 'OTU', colour: 'butter', players: squad(['Harish Chandra', 'Gaurav Mishra', 'Nitin Agarwal', 'Pooja Verma', 'Ravi Shankar', 'Zaid Ahmed', 'Mohit Jain']) },
  { name: 'Greenfield FC', shortName: 'GFC', colour: 'lilac', players: squad(['Suresh Iyer', 'Ananya Rao', 'Vikas Chauhan', 'Farhan Malik', 'Aditya Roy', 'Kavya Menon', 'Rajesh Kumar']) },
  { name: 'Northside Strikers', shortName: 'NSS', colour: 'peach', players: squad(['Yash Thakur', 'Ishaan Bhatt', 'Meera Pillai', 'Sneha Kulkarni', 'Varun Malhotra', 'Aarav Shah', 'Divya Nambiar']) },
];

const FUTSAL_TEAMS = [
  { name: 'Futsal Falcons', shortName: 'FFC', colour: 'mint', players: squad(['Ravi Teja', 'Sana Khan', 'Arun Pillai', 'Nisha Gupta', 'Kunal Shah']) },
  { name: 'Indoor Kings', shortName: 'IDK', colour: 'butter', players: squad(['Siddharth Rao', 'Tanvi Desai', 'Aryan Kapoor', 'Ritu Malhotra', 'Jay Patel']) },
  { name: 'Court Crushers', shortName: 'CTC', colour: 'pink', players: squad(['Naman Verma', 'Ira Singh', 'Devang Mehta', 'Kiara Nair', 'Om Prakash']) },
  { name: 'Net Ninjas', shortName: 'NNJ', colour: 'sky', players: squad(['Parth Trivedi', 'Anika Bose', 'Reyansh Jain', 'Tara Iyer', 'Veer Singh']) },
];

// Deterministic demo scores so the seeded table is stable between runs.
function demoScore(homeIdx, awayIdx, week) {
  return { home: (homeIdx * 2 + week) % 4, away: (awayIdx + week * 2) % 3 };
}

function goalEvents(team, count, startMinute, scorerPool) {
  const events = [];
  for (let i = 0; i < count; i += 1) {
    const minute = Math.min(88, startMinute + i * 17 + (i % 2) * 6);
    const scorer = scorerPool[(i * 2 + 1) % scorerPool.length];
    events.push({ minute, type: i === 1 && count > 2 ? 'penalty' : 'goal', team: team._id, player: scorer.name, note: '' });
  }
  return events;
}

async function buildLeague(organizerId, spec, teamSpecs, finishedWeeks, liveWeek) {
  const league = await League.create({
    name: spec.name, sport: spec.sport, season: spec.season, city: spec.city,
    description: spec.description, colour: spec.colour, organizer: organizerId,
    status: 'active', fixturesGenerated: true,
  });
  const teams = [];
  for (const t of teamSpecs) {
    const team = await Team.create({ ...t, league: league._id });
    teams.push(team);
  }
  const rounds = roundRobin(teams.map((t) => t._id));
  const first = new Date();
  first.setDate(first.getDate() - (finishedWeeks * 7));
  first.setHours(16, 0, 0, 0);
  const dates = fixtureDates(first, rounds);
  const docs = [];
  rounds.forEach((fixtures, i) => {
    fixtures.forEach(({ home, away }) => {
      docs.push({ league: league._id, homeTeam: home, awayTeam: away, matchweek: i + 1, scheduledAt: dates[i] });
    });
  });
  const matches = await Match.insertMany(docs);

  const now = new Date();
  for (const m of matches) {
    const homeIdx = teams.findIndex((t) => String(t._id) === String(m.homeTeam));
    const awayIdx = teams.findIndex((t) => String(t._id) === String(m.awayTeam));
    const homeTeam = teams[homeIdx];
    const awayTeam = teams[awayIdx];
    if (m.matchweek <= finishedWeeks) {
      const { home, away } = demoScore(homeIdx, awayIdx, m.matchweek);
      const events = [
        ...goalEvents(homeTeam, home, 9, homeTeam.players),
        ...goalEvents(awayTeam, away, 14, awayTeam.players),
      ];
      if ((homeIdx + awayIdx + m.matchweek) % 3 === 0) {
        events.push({ minute: 63, type: 'yellow', team: awayTeam._id, player: awayTeam.players[2].name, note: 'Late tackle' });
      }
      m.status = 'finished';
      m.events = events;
      m.homeScore = home;
      m.awayScore = away;
      m.startedAt = new Date(m.scheduledAt);
      m.finishedAt = new Date(new Date(m.scheduledAt).getTime() + 105 * 60000);
      await m.save();
    } else if (m.matchweek === liveWeek && m === matches.find((x) => x.matchweek === liveWeek)) {
      // The first match of the live week is in progress right now.
      const hp = (i) => homeTeam.players[i % homeTeam.players.length];
      const ap = (i) => awayTeam.players[i % awayTeam.players.length];
      const events = [
        { minute: 12, type: 'goal', team: homeTeam._id, player: hp(5).name, note: '' },
        { minute: 27, type: 'yellow', team: awayTeam._id, player: ap(1).name, note: 'Time wasting' },
        { minute: 31, type: 'goal', team: awayTeam._id, player: ap(4).name, note: '' },
        { minute: 34, type: 'goal', team: homeTeam._id, player: hp(3).name, note: '' },
      ];
      m.status = 'live';
      m.events = events;
      m.homeScore = 2;
      m.awayScore = 1;
      m.scheduledAt = new Date(now.getTime() - 40 * 60000);
      m.startedAt = new Date(now.getTime() - 35 * 60000);
      await m.save();
    }
  }
  return { league, teams };
}

async function seed() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const users = {};
  for (const u of DEMO_USERS) {
    const user = await User.create({ ...u, passwordHash });
    users[u.role] = user;
  }
  await buildLeague(users.organizer._id, {
    name: 'Sunday Football League', sport: 'Football', season: '2026–27', city: 'Azamgarh',
    description: 'A community football league for neighbourhood teams across Azamgarh. Matches every Saturday at the college ground.',
    colour: 'pink',
  }, FOOTBALL_TEAMS, 2, 3);
  await buildLeague(users.organizer._id, {
    name: 'Friday Futsal League', sport: 'Futsal', season: '2026–27', city: 'Azamgarh',
    description: 'Fast five-a-side futsal under lights every Friday evening at the indoor court.',
    colour: 'mint',
  }, FUTSAL_TEAMS, 1, 2);
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
  await mongoose.connect(uri, { dbName: 'playpulse' });
  await Promise.all([User.deleteMany({}), League.deleteMany({}), Team.deleteMany({}), Match.deleteMany({})]);
  await seed();
  console.log('Seeded PlayPulse demo data');
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seed;
