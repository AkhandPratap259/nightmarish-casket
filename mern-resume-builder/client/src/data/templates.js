// All copy and template definitions live here — components only render data.
// Template names are the product's own; nothing here claims a real client,
// award, metric or deployment.

export const TEMPLATES = {
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    blurb: 'Type-led, one column, thin rules. The resume reads like a printed page.',
  },
  split: {
    id: 'split',
    label: 'Split',
    blurb: 'Dark rail on the left for contact and skills, ivory page on the right.',
  },
  classic: {
    id: 'classic',
    label: 'Classic',
    blurb: 'Centred header, compact sections, the format recruiters scan fastest.',
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export const STATUS_LABELS = {
  draft: 'Draft',
  ready: 'Ready',
};

export const DEMO = {
  email: 'demo@resumeforge.example',
  password: 'ResumeForge123!',
};

// Honest engine labels shown next to every AI/fallback rewrite.
export const ENGINE_LABELS = {
  openai: 'Rewritten with OpenAI',
  gemini: 'Rewritten with Gemini',
  'rule-based': 'Rewritten with the built-in rule-based improver (no AI key needed)',
};
