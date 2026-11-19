export const AREAS = [
  'Azamgarh',
  'Civil Lines',
  'Jiyanpur',
  'Mubarakpur',
  'Phoolpur',
  'Saraimeer',
  'Nizamabad',
  'Atraulia',
  'Bilariaganj',
];

export const CATEGORIES = [
  'Home Cleaning',
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Beauty & Salon',
  'Tutoring',
];

export const SERVICE_ICONS = {
  sparkle: '✦',
  drop: '◍',
  bolt: 'ϟ',
  snow: '❄',
  gear: '⚙',
  scissors: '✂',
  book: '✎',
  wrench: '⚒',
};

export const STATUS_LABELS = {
  requested: 'Requested',
  accepted: 'Accepted',
  in_progress: 'In progress',
  completed: 'Completed',
  declined: 'Declined',
  cancelled_by_customer: 'Cancelled by you',
  cancelled_by_provider: 'Cancelled by provider',
};

export const STATUS_STEPS = ['requested', 'accepted', 'in_progress', 'completed'];

export const MATCH_FORMULA = [
  { label: 'Provider rating', points: 30, text: 'Average review rating, out of 5, worth up to 30 points. New providers start at a neutral 4.0 until reviewed.' },
  { label: 'Completed jobs', points: 20, text: 'Jobs finished, up to 20 points at 50 completed jobs.' },
  { label: 'Response rate', points: 20, text: 'Share of requests the provider answered, up to 20 points. New providers start at 100% until a request arrives.' },
  { label: 'Price vs median', points: 20, text: 'How the price compares with the median price for the same service, up to 20 points.' },
  { label: 'Serves your area', points: 10, text: '10 points when the provider serves your selected area, 5 when no area is selected.' },
];

export const DEMO_ACCOUNTS = [
  { role: 'Customer', email: 'demo@tasktrove.example', password: 'TaskTrove123!' },
  { role: 'Provider', email: 'demo-provider@tasktrove.example', password: 'TaskTrove123!' },
  { role: 'Admin', email: 'admin@tasktrove.example', password: 'TaskTrove123!' },
];
