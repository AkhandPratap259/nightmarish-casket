// Demo seed data. Every account below is a labelled demo account for
// trying the app locally — none of these people are real patients or doctors.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { addDays, dateStr, generateSlots } = require('../utils/slots');

const DOCTORS = [
  {
    name: 'Dr. Ananya Sharma',
    email: 'ananya.sharma@medibook.example',
    speciality: 'General Medicine',
    qualification: 'MBBS, MD (Medicine)',
    experienceYears: 12,
    clinic: 'City Care Clinic',
    city: 'Azamgarh',
    fee: 500,
    bio: 'General physician focused on preventive care, diabetes and thyroid management.',
    days: [1, 2, 3, 4, 5, 6],
    sessions: [
      { start: '09:00', end: '13:00' },
      { start: '17:00', end: '20:00' },
    ],
    slotMinutes: 30,
  },
  {
    name: 'Dr. Rohan Verma',
    email: 'rohan.verma@medibook.example',
    speciality: 'Cardiology',
    qualification: 'MBBS, MD, DM (Cardiology)',
    experienceYears: 15,
    clinic: 'Heart Care Centre',
    city: 'Azamgarh',
    fee: 900,
    bio: 'Interventional cardiologist; hypertension, heart failure and post-stent follow-up.',
    days: [1, 3, 5],
    sessions: [{ start: '10:00', end: '14:00' }],
    slotMinutes: 30,
  },
  {
    name: 'Dr. Meera Nair',
    email: 'meera.nair@medibook.example',
    speciality: 'Dermatology',
    qualification: 'MBBS, MD (Dermatology)',
    experienceYears: 9,
    clinic: 'Skin & Glow Clinic',
    city: 'Azamgarh',
    fee: 700,
    bio: 'Dermatologist for acne, eczema, hair loss and routine skin checks.',
    days: [2, 4, 6],
    sessions: [
      { start: '11:00', end: '14:00' },
      { start: '16:00', end: '19:00' },
    ],
    slotMinutes: 20,
  },
  {
    name: 'Dr. Kabir Singh',
    email: 'kabir.singh@medibook.example',
    speciality: 'Orthopaedics',
    qualification: 'MBBS, MS (Orthopaedics)',
    experienceYears: 11,
    clinic: 'Bone & Joint Clinic',
    city: 'Azamgarh',
    fee: 800,
    bio: 'Orthopaedic surgeon; fractures, sports injuries and joint pain.',
    days: [1, 2, 4, 5],
    sessions: [{ start: '09:30', end: '13:30' }],
    slotMinutes: 30,
  },
  {
    name: 'Dr. Priya Desai',
    email: 'priya.desai@medibook.example',
    speciality: 'Paediatrics',
    qualification: 'MBBS, MD (Paediatrics)',
    experienceYears: 8,
    clinic: 'Little Steps Child Clinic',
    city: 'Azamgarh',
    fee: 600,
    bio: 'Paediatrician for newborn care, vaccinations and childhood illness.',
    days: [1, 2, 3, 5, 6],
    sessions: [
      { start: '09:00', end: '12:00' },
      { start: '17:00', end: '19:30' },
    ],
    slotMinutes: 20,
  },
  {
    name: 'Dr. Arjun Patel',
    email: 'arjun.patel@medibook.example',
    speciality: 'Dentistry',
    qualification: 'BDS, MDS (Orthodontics)',
    experienceYears: 10,
    clinic: 'Bright Smile Dental',
    city: 'Azamgarh',
    fee: 650,
    bio: 'Dentist for check-ups, fillings, root canals and braces.',
    days: [2, 3, 4, 6],
    sessions: [{ start: '10:00', end: '13:00' }],
    slotMinutes: 30,
  },
];

async function seed() {
  const count = await User.countDocuments();
  if (count > 0) return;
  const hash = await bcrypt.hash('MediBook123!', 10);

  const admin = await User.create({
    name: 'Clinic Admin',
    email: 'admin@medibook.example',
    passwordHash: hash,
    role: 'admin',
  });
  const patient = await User.create({
    name: 'Demo Patient',
    email: 'demo@medibook.example',
    passwordHash: hash,
    role: 'patient',
    phone: '98765 43210',
  });
  const demoDoctor = await User.create({
    name: 'Dr. Demo Physician',
    email: 'demo-doctor@medibook.example',
    passwordHash: hash,
    role: 'doctor',
    doctorProfile: {
      speciality: 'General Medicine',
      qualification: 'MBBS, MD (Medicine)',
      experienceYears: 6,
      clinic: 'City Care Clinic',
      city: 'Azamgarh',
      fee: 400,
      bio: 'Demo doctor account for trying the doctor dashboard.',
      days: [1, 2, 3, 4, 5],
      sessions: [{ start: '09:00', end: '13:00' }],
      slotMinutes: 30,
    },
  });

  const doctorUsers = [];
  for (const d of DOCTORS) {
    const { email, name, ...profile } = d;
    doctorUsers.push(
      await User.create({ name, email, passwordHash: hash, role: 'doctor', doctorProfile: profile })
    );
  }

  // A few demo appointments so dashboards and analytics have real rows:
  // two completed visits (with notes + prescription) in the past, and a
  // handful of upcoming bookings spread over the next working days.
  const past = addDays(new Date(), -2);
  const pastSlots = generateSlots(doctorUsers[0].doctorProfile, past);
  if (pastSlots.length >= 2) {
    await Appointment.create({
      patient: patient._id,
      doctor: doctorUsers[0]._id,
      date: dateStr(past),
      time: pastSlots[0],
      reason: 'Fever and sore throat for 2 days',
      status: 'completed',
      fee: doctorUsers[0].doctorProfile.fee,
      visitNotes: 'Viral upper respiratory infection. Advised rest, fluids and review in 5 days if fever persists.',
      prescription: [
        { medicine: 'Paracetamol 650 mg', dosage: '1 tablet twice daily after food', duration: '5 days' },
        { medicine: 'Cetirizine 10 mg', dosage: '1 tablet at night', duration: '5 days' },
      ],
    });
  }
  const past2 = addDays(new Date(), -5);
  const past2Slots = generateSlots(doctorUsers[4].doctorProfile, past2);
  if (past2Slots.length >= 1) {
    await Appointment.create({
      patient: patient._id,
      doctor: doctorUsers[4]._id,
      date: dateStr(past2),
      time: past2Slots[0],
      reason: 'Vaccination follow-up',
      status: 'completed',
      fee: doctorUsers[4].doctorProfile.fee,
      visitNotes: 'Routine immunisation visit. Next dose due in 4 weeks.',
      prescription: [],
    });
  }
  for (let i = 0; i < 3; i += 1) {
    const day = addDays(new Date(), i + 1);
    const doc = doctorUsers[i % doctorUsers.length];
    const slots = generateSlots(doc.doctorProfile, day);
    if (!slots.length) continue;
    await Appointment.create({
      patient: patient._id,
      doctor: doc._id,
      date: dateStr(day),
      time: slots[2] || slots[0],
      reason: 'Follow-up consultation',
      status: i === 0 ? 'confirmed' : 'booked',
      fee: doc.doctorProfile.fee,
    });
  }

  console.log('Seeded MediBook demo data (admin / demo patient / demo doctor: MediBook123!)');
  return { admin, patient, demoDoctor };
}

module.exports = seed;
