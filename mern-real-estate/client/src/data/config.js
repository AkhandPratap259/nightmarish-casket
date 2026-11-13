// All copy and configuration for NestHunt lives here; components only render it.
export const config = {
  name: 'NestHunt',
  tagline: 'Find a place that fits.',
  demoEmail: 'demo@nesthunt.example',
  demoAgentEmail: 'demo-agent@nesthunt.example',
  demoAdminEmail: 'admin@nesthunt.example',
  demoPassword: 'NestHunt123!',
  // No live property or payment links exist; nothing to link out to.
  repoLink: '',
  demoLink: '',
};

export const TYPE_LABELS = {
  apartment: 'Apartment',
  house: 'House',
  villa: 'Villa',
  plot: 'Plot',
  commercial: 'Commercial',
};

export const STATUS_LABELS = {
  available: 'Available',
  'under-offer': 'Under offer',
  sold: 'Sold',
};
