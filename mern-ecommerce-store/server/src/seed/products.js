const img = (seed) => `https://picsum.photos/seed/${seed}/800/600`;

module.exports = [
  { name: 'Aurora Wireless Headphones', description: 'Noise-cancelling over-ear headphones with 40-hour battery life and a foldable travel design.', price: 89.99, category: 'Electronics', image: img('headphones'), stock: 24, rating: 4.8, featured: true },
  { name: 'Pulse Smartwatch', description: 'Fitness tracking, heart-rate monitoring and notifications, with a bright AMOLED display.', price: 129.99, category: 'Electronics', image: img('smartwatch'), stock: 18, rating: 4.6, featured: true },
  { name: 'Nomad Backpack', description: 'Water-resistant 25L backpack with a padded laptop sleeve and USB charging port.', price: 59.99, category: 'Fashion', image: img('backpack'), stock: 40, rating: 4.7, featured: true },
  { name: 'Trail Running Shoes', description: 'Lightweight, breathable running shoes with responsive cushioning for daily miles.', price: 79.99, category: 'Fashion', image: img('shoes'), stock: 32, rating: 4.5 },
  { name: 'Haven Ceramic Mug Set', description: 'Set of four hand-glazed ceramic mugs, dishwasher and microwave safe.', price: 34.99, category: 'Home', image: img('mugs'), stock: 60, rating: 4.9 },
  { name: 'Lumen Desk Lamp', description: 'Adjustable LED desk lamp with three colour temperatures and a built-in USB port.', price: 44.99, category: 'Home', image: img('lamp'), stock: 27, rating: 4.4 },
  { name: 'Core Yoga Mat', description: 'Non-slip 6mm yoga mat with carry strap, ideal for home workouts and studio classes.', price: 29.99, category: 'Fitness', image: img('yogamat'), stock: 50, rating: 4.6 },
  { name: 'Hydra Steel Bottle', description: 'Insulated 750ml steel bottle that keeps drinks cold for 24 hours or hot for 12.', price: 24.99, category: 'Fitness', image: img('bottle'), stock: 80, rating: 4.8 },
  { name: 'Mechanical Keyboard 75%', description: 'Hot-swappable mechanical keyboard with RGB backlight and quiet linear switches.', price: 99.99, category: 'Electronics', image: img('keyboard'), stock: 15, rating: 4.7, featured: true },
  { name: 'Everyday Cotton Tee', description: 'Soft, breathable organic cotton tee in a relaxed regular fit.', price: 19.99, category: 'Fashion', image: img('tee'), stock: 100, rating: 4.3 },
  { name: 'Focus Notebook Bundle', description: 'Three dot-grid notebooks with lay-flat binding for planning, journaling and sketching.', price: 21.99, category: 'Home', image: img('notebooks'), stock: 70, rating: 4.5 },
  { name: 'Echo Bluetooth Speaker', description: 'Portable Bluetooth speaker with deep bass, 18-hour playtime and IPX5 splash resistance.', price: 49.99, category: 'Electronics', image: img('speaker'), stock: 22, rating: 4.6 },
];
