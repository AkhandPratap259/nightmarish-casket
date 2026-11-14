// All copy and configuration for BidSphere lives here; components only render it.
export const config = {
  name: 'BidSphere',
  tagline: 'Bid live. Win loud.',
  demoEmail: 'demo@bidsphere.example',
  demoSellerEmail: 'demo-seller@bidsphere.example',
  demoAdminEmail: 'admin@bidsphere.example',
  demoPassword: 'BidSphere123!',
  // No live auction or payment links exist; nothing to link out to.
  repoLink: '',
  demoLink: '',
};

// Anti-sniping rule, shown wherever bidding is explained.
export const ANTI_SNIPE_NOTE =
  'A bid placed in the final 60 seconds extends the auction by 60 seconds — nobody wins by sniping the last second.';
