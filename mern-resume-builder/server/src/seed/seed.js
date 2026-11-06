const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Resume = require('../models/Resume');

// Demo account + one sample resume. The sample persona is fictional and
// labelled as such in the app — it is placeholder data for trying the
// editor, not anyone's real resume.
async function seed() {
  const email = 'demo@resumeforge.example';
  let user = await User.findOne({ email });
  if (!user) {
    const passwordHash = await bcrypt.hash('ResumeForge123!', 10);
    user = await User.create({ name: 'Demo User', email, passwordHash });
    console.log('Demo user seeded: demo@resumeforge.example');
  }
  const existing = await Resume.findOne({ user: user._id });
  if (existing) return;
  await Resume.create({
    user: user._id,
    title: 'Sample — Aarav Mehta (fictional data)',
    template: 'editorial',
    status: 'draft',
    personal: {
      name: 'Aarav Mehta',
      headline: 'B.Tech Computer Science student — MERN developer',
      email: 'aarav.mehta.sample@example.com',
      phone: '+91 98765 43210',
      location: 'Pune, India',
      linkedin: 'linkedin.com/in/aarav-mehta-sample',
      website: 'github.com/aarav-mehta-sample',
      summary:
        'Final-year B.Tech Computer Science student who builds full-stack web apps with MongoDB, Express, React and Node. Shipped three MERN projects with auth, real-time features and analytics, and led the college coding club\'s web team. Looking for a fresher software developer role where I can own features end to end.',
    },
    experience: [
      {
        role: 'Web Development Intern',
        company: 'TechSpark Labs',
        start: 'Jun 2025',
        end: 'Aug 2025',
        current: false,
        bullets: [
          'Built a dashboard that shows order data for 40+ vendors in one place',
          'Worked on the login system and helped with testing',
          'Reduced page load time by fixing slow API calls',
        ],
      },
      {
        role: 'Web Team Lead, Coding Club',
        company: 'College Coding Club',
        start: 'Aug 2024',
        end: '',
        current: true,
        bullets: [
          'Led a team of 6 students building the club website and event portal',
          'Organised 3 hackathons with 120 participants in total',
        ],
      },
    ],
    education: [
      {
        degree: 'B.Tech, Computer Science',
        school: 'Sample Institute of Technology',
        start: '2022',
        end: '2026',
        details: 'CGPA 8.1/10 (sample figure for the fictional persona)',
      },
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'Socket.io', 'Git', 'Tailwind CSS'],
    projects: [
      {
        name: 'CampusKart — MERN e-commerce store',
        link: 'github.com/aarav-mehta-sample/campuskart',
        description:
          'Full-stack store with JWT auth, cart, checkout with stock control and an admin dashboard. 12 products seeded, orders persisted in MongoDB.',
        tags: ['MERN', 'JWT', 'MongoDB'],
      },
      {
        name: 'ChatWave — real-time chat app',
        link: 'github.com/aarav-mehta-sample/chatwave',
        description:
          'Socket.io chat with rooms, presence and typing indicators, messages persisted in MongoDB.',
        tags: ['Socket.io', 'React', 'MongoDB'],
      },
    ],
  });
  console.log('Sample resume seeded');
}

module.exports = seed;
