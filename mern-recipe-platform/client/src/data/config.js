// Links and endpoints for FlavorForge. Empty values render as "link soon" —
// no URL is invented here.
export const CONFIG = {
  repoUrl: '',
  demoUrl: '',
  supportEmail: '',
};

export function linkOrSoon(value) {
  return value || 'link soon';
}
