// Seed board for the demo project. Dates are relative to "today" so the
// seeded board always has live, overdue and upcoming cards to explore.
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

module.exports = [
  { title: 'Audit current homepage analytics', status: 'todo', priority: 'medium', labels: ['research'], due: 5, checklist: [{ text: 'Export last 90 days of traffic', done: true }, { text: 'Note top 5 exit pages', done: false }] },
  { title: 'Write copy for new hero section', status: 'todo', priority: 'high', labels: ['copy', 'design'], due: 4, checklist: [] },
  { title: 'Source hero photography', status: 'todo', priority: 'low', labels: ['design'], due: 9, checklist: [] },
  { title: 'Build responsive hero + nav', status: 'in-progress', priority: 'urgent', labels: ['frontend'], due: 2, checklist: [{ text: 'Mobile nav', done: true }, { text: 'Desktop hero layout', done: true }, { text: 'Keyboard navigation', done: false }] },
  { title: 'Migrate product pages to new template', status: 'in-progress', priority: 'high', labels: ['frontend'], due: 3, checklist: [{ text: 'Migrate 12 pages', done: false }] },
  { title: 'Set up staging deploy pipeline', status: 'in-progress', priority: 'medium', labels: ['devops'], due: -1, checklist: [{ text: 'Staging env', done: true }, { text: 'Preview deploys on PR', done: false }] },
  { title: 'Accessibility pass (contrast + focus states)', status: 'review', priority: 'high', labels: ['a11y'], due: 1, checklist: [] },
  { title: 'Proofread all landing copy', status: 'review', priority: 'medium', labels: ['copy'], due: 6, checklist: [] },
  { title: 'Launch sitemap + redirects', status: 'done', priority: 'high', labels: ['seo'], due: -3, checklist: [{ text: 'Redirect map', done: true }, { text: 'Submit sitemap', done: true }] },
  { title: 'Brand tokens approved by client', status: 'done', priority: 'medium', labels: ['design'], due: -5, checklist: [] },
  { title: 'Retire old landing pages', status: 'done', priority: 'low', labels: ['cleanup'], due: -2, checklist: [] },
];

module.exports.daysFromNow = daysFromNow;
