// Self-contained SVG placeholder art, so product images render offline
// without depending on any external image service.
function svgImage(name, emoji, c1, c2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>`
    + `<rect width="800" height="600" fill="url(#g)"/>`
    + `<text x="400" y="270" font-size="150" text-anchor="middle">${emoji}</text>`
    + `<text x="400" y="400" font-size="42" font-family="sans-serif" font-weight="bold" fill="white" text-anchor="middle">${name}</text>`
    + `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const P = (name, description, price, category, emoji, c1, c2, stock, rating, featured) => ({
  name, description, price, category,
  image: svgImage(name, emoji, c1, c2),
  stock, rating, featured: !!featured,
});

module.exports = [
  P('Aurora Wireless Headphones', 'Noise-cancelling over-ear headphones with 40-hour battery life and a foldable travel design.', 89.99, 'Electronics', '🎧', '#0f2040', '#0e7c7b', 24, 4.8, true),
  P('Pulse Smartwatch', 'Fitness tracking, heart-rate monitoring and notifications, with a bright AMOLED display.', 129.99, 'Electronics', '⌚', '#1e3a5f', '#2a9d8f', 18, 4.6, true),
  P('Nomad Backpack', 'Water-resistant 25L backpack with a padded laptop sleeve and USB charging port.', 59.99, 'Fashion', '🎒', '#6d28d9', '#0e7c7b', 40, 4.7, true),
  P('Trail Running Shoes', 'Lightweight, breathable running shoes with responsive cushioning for daily miles.', 79.99, 'Fashion', '👟', '#b45309', '#dc2626', 32, 4.5),
  P('Haven Ceramic Mug Set', 'Set of four hand-glazed ceramic mugs, dishwasher and microwave safe.', 34.99, 'Home', '☕', '#92400e', '#d97706', 60, 4.9),
  P('Lumen Desk Lamp', 'Adjustable LED desk lamp with three colour temperatures and a built-in USB port.', 44.99, 'Home', '💡', '#ca8a04', '#facc15', 27, 4.4),
  P('Core Yoga Mat', 'Non-slip 6mm yoga mat with carry strap, ideal for home workouts and studio classes.', 29.99, 'Fitness', '🧘', '#065f46', '#10b981', 50, 4.6),
  P('Hydra Steel Bottle', 'Insulated 750ml steel bottle that keeps drinks cold for 24 hours or hot for 12.', 24.99, 'Fitness', '🧴', '#0369a1', '#22d3ee', 80, 4.8),
  P('Mechanical Keyboard 75%', 'Hot-swappable mechanical keyboard with RGB backlight and quiet linear switches.', 99.99, 'Electronics', '⌨️', '#312e81', '#7c3aed', 15, 4.7, true),
  P('Everyday Cotton Tee', 'Soft, breathable organic cotton tee in a relaxed regular fit.', 19.99, 'Fashion', '👕', '#334155', '#64748b', 100, 4.3),
  P('Focus Notebook Bundle', 'Three dot-grid notebooks with lay-flat binding for planning, journaling and sketching.', 21.99, 'Home', '📓', '#7c2d12', '#ea580c', 70, 4.5),
  P('Echo Bluetooth Speaker', 'Portable Bluetooth speaker with deep bass, 18-hour playtime and IPX5 splash resistance.', 49.99, 'Electronics', '🔊', '#0f172a', '#475569', 22, 4.6),
];
