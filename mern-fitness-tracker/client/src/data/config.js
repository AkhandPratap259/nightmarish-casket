// All copy and configuration for PulseFit lives here; components only render it.
export const config = {
  name: 'PulseFit',
  tagline: 'Train with a plan, see the progress.',
  demoMemberEmail: 'demo@pulsefit.example',
  demoTrainerEmail: 'demo-trainer@pulsefit.example',
  demoAdminEmail: 'admin@pulsefit.example',
  demoPassword: 'PulseFit123!',
  // No live links exist; nothing to link out to.
  repoLink: '',
  demoLink: '',
};

export const MUSCLE_GROUPS = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'legs', label: 'Legs' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'full-body', label: 'Full body' },
];

export const MUSCLE_LABELS = Object.fromEntries(
  MUSCLE_GROUPS.map((g) => [g.value, g.label])
);

export function muscleLabel(value) {
  return MUSCLE_LABELS[value] || value || 'Other';
}

export const GOALS = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Muscle growth' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general', label: 'General fitness' },
];

export const HOME_COPY = {
  heroEyebrow: 'Fitness tracking, without the noise',
  heroHeadlineA: 'Train with a plan,',
  heroHeadlineEm: 'see the progress.',
  heroDescription:
    'PulseFit turns every session into data you can act on: build a template, log sets live with a rest timer, and watch personal records, weekly volume and streaks grow — no invented numbers, everything comes from your own logged sets.',
  howTitle: 'How a session works',
  howSteps: [
    {
      n: '01',
      title: 'Build a template',
      body: 'Pick exercises from the library, set target sets, reps and weight, and drag them into the order you want to train.',
    },
    {
      n: '02',
      title: 'Log it live',
      body: 'Start the session and log each set as you finish it. A rest timer counts down between sets and your total volume updates live.',
    },
    {
      n: '03',
      title: 'Watch records fall',
      body: 'Finishing a session computes your volume, detects new personal records, updates challenges, and suggests your next-session weight.',
    },
  ],
};
