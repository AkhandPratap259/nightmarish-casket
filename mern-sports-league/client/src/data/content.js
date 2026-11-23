// Copy lives in data files; components only render it. No invented
// testimonials, metrics or external links are used anywhere in this app.
export const HERO = {
  eyebrow: 'Community leagues, run properly',
  title: 'Every match. Every goal. One scoreboard.',
  lead: 'PlayPulse turns a neighbourhood league into a broadcast: round-robin fixtures in one click, a live match centre, standings with real tiebreakers and a scorers chart that updates as goals go in.',
  primaryCta: 'Browse leagues',
  secondaryCta: 'Start a league',
};

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create the league',
    body: 'Name it, pick the sport, set the points system. Football, futsal or hockey — the rules bend to your league, not the other way round.',
  },
  {
    step: '02',
    title: 'Add the teams',
    body: 'Squads with positions and shirt numbers. Two teams are enough to start; add the rest before fixtures are generated.',
  },
  {
    step: '03',
    title: 'Generate fixtures & go live',
    body: 'One click builds the full round-robin season. Kick off a match, log goals as they happen, and the table sorts itself.',
  },
];

export const EMPTY_STATES = {
  leagues: 'No leagues match those filters yet.',
  fixtures: 'No fixtures yet — generate the season to fill this list.',
  standings: 'No finished matches yet. The table fills in as results come in.',
  scorers: 'No goals logged yet. The chart wakes up at the first goal.',
  events: 'No events yet. Kick off and log the first goal.',
};
