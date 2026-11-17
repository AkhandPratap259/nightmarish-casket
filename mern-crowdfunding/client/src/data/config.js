// All copy and configuration for FundForge lives here; components only render it.
export const config = {
  name: 'FundForge',
  tagline: 'Fund the ideas that matter.',
  demoBackerEmail: 'demo@fundforge.example',
  demoCreatorEmail: 'demo-creator@fundforge.example',
  demoAdminEmail: 'admin@fundforge.example',
  demoPassword: 'FundForge123!',
  // No live links exist; nothing to link out to.
  repoLink: '',
  demoLink: '',
};

export const CATEGORIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'arts', label: 'Arts & Crafts' },
  { value: 'film', label: 'Film & Video' },
  { value: 'music', label: 'Music' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'food', label: 'Food & Drink' },
  { value: 'community', label: 'Community' },
  { value: 'environment', label: 'Environment' },
];

export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export const STATUS_LABELS = {
  draft: 'Draft',
  live: 'Live',
  funded: 'Funded',
  failed: 'Failed',
  fulfilled: 'Fulfilled',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'ending', label: 'Ending soon' },
  { value: 'funded', label: 'Most funded' },
  { value: 'goal', label: 'Smallest goal' },
];

export const HOW_IT_WORKS = [
  {
    n: '01',
    title: 'Back a campaign',
    body: 'Pick a project you believe in and pledge an amount. Rewards unlock at set tiers — and every pledge is mock only, so no real money moves.',
  },
  {
    n: '02',
    title: 'Watch it fund',
    body: 'Funding bars, stretch goals and a live pledge feed show progress in public. If a campaign misses its goal, it closes as failed.',
  },
  {
    n: '03',
    title: 'Creators deliver',
    body: 'Funded campaigns move to delivery. Creators post updates, answer comments and mark the campaign fulfilled when rewards ship.',
  },
];

export const HOME_COPY = {
  heroEyebrow: 'Crowdfunding, in the open',
  heroHeadlineA: 'Fund the ideas',
  heroHeadlineEm: 'that matter.',
  heroDescription:
    'FundForge is where bold ideas find their first backers. Pledge to a campaign, follow its funding live, and watch creators deliver — all in public, with no hidden fees and no real money moving in this demo.',
  creatorsTitle: 'For creators',
  creatorsBody:
    'Launch a campaign in minutes: a story, a goal, a deadline, and reward tiers your backers will love. Publish when ready, post updates as you build, and mark it fulfilled when every reward is delivered.',
  creatorsPoints: [
    'Draft first, publish when ready',
    'Reward tiers with limited quantities',
    'Stretch goals that keep momentum going',
    'Updates and comments built in',
  ],
};

export function formatINR(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function categoryLabel(value) {
  return CATEGORY_LABELS[value] || value || 'Uncategorised';
}
