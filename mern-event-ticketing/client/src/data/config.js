// All copy and configuration for Gatherly lives here; components only render it.
// Empty values render as a labelled "link soon" placeholder, never a fake URL.
export const config = {
  appName: 'Gatherly',
  tagline: 'Find your night, book your seat.',
  contactEmail: '',
  repoUrl: '',
  categories: ['Music', 'Tech', 'Comedy', 'Theatre', 'Sports', 'Food & Culture'],
  cities: ['Azamgarh', 'Lucknow', 'Delhi', 'Mumbai', 'Bengaluru', 'Varanasi'],
  demoAccounts: [
    { label: 'Attendee', email: 'demo@gatherly.example', password: 'Gatherly123!' },
    { label: 'Organizer', email: 'demo-organizer@gatherly.example', password: 'Gatherly123!' },
    { label: 'Admin', email: 'admin@gatherly.example', password: 'Gatherly123!' },
  ],
  // Default tiered layout offered when an organizer creates an event.
  defaultZones: [
    { name: 'VIP', price: 1499, rows: [{ label: 'A', count: 8 }, { label: 'B', count: 8 }] },
    { name: 'Premium', price: 899, rows: [{ label: 'C', count: 10 }, { label: 'D', count: 10 }, { label: 'E', count: 10 }] },
    { name: 'Standard', price: 499, rows: [{ label: 'F', count: 12 }, { label: 'G', count: 12 }, { label: 'H', count: 12 }, { label: 'I', count: 12 }] },
  ],
};

export const copy = {
  heroEyebrow: 'Gatherly — Event discovery & ticketing',
  heroHeadline: 'Find your night,',
  heroEmphasis: 'book your seat.',
  heroText:
    'Browse events by city and category, pick your exact seat on a live seat map, and get an e-ticket in minutes. Holds last five minutes, seats can never be double-booked, and checkout is a clearly-labelled mock — no real payment, ever.',
  howItWorks: [
    { n: '01', title: 'Browse the night', text: 'Filter by category, city or date. Every event shows live availability, so sold-out is sold-out — not a surprise at checkout.' },
    { n: '02', title: 'Pick your exact seat', text: 'The seat map shows every seat by zone and price. Click up to six, hold them for five minutes, and watch the countdown.' },
    { n: '03', title: 'Get your e-ticket', text: 'Confirm with the mock checkout and each seat gets its own ticket code. Show the code at the door; organizers check it in live.' },
  ],
};
