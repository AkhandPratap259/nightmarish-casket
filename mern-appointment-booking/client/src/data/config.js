// All copy and configuration for MediBook lives here; components only render it.
// Empty values render as a labelled "link soon" placeholder, never a fake URL.
export const config = {
  appName: 'MediBook',
  tagline: 'Care, booked in minutes.',
  contactEmail: '',
  repoUrl: '',
  demoAccounts: [
    { label: 'Patient', email: 'demo@medibook.example', password: 'MediBook123!' },
    { label: 'Doctor', email: 'demo-doctor@medibook.example', password: 'MediBook123!' },
    { label: 'Admin', email: 'admin@medibook.example', password: 'MediBook123!' },
  ],
};

export const copy = {
  heroEyebrow: 'MediBook — Appointment booking',
  heroHeadline: 'See a doctor,',
  heroEmphasis: 'without the waiting room.',
  heroText:
    'Browse doctors by speciality, pick a real time slot from their live schedule, and manage every visit in one place. If a day is full, join the waitlist — a cancelled slot comes straight to you.',
  howItWorks: [
    { n: '01', title: 'Find your doctor', text: 'Filter by speciality, fee or clinic. Every doctor lists their real weekly schedule.' },
    { n: '02', title: 'Pick a live slot', text: 'Slots are generated from the doctor’s schedule. A booked slot can never be double-booked.' },
    { n: '03', title: 'Get seen, get notes', text: 'After the visit, notes and prescriptions land in your records — no paper slips to lose.' },
  ],
};
