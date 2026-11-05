const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');

const MENUS = [
  {
    name: 'Punjabi Tadka', cuisine: 'North Indian', area: 'Civil Lines', emoji: '🍛',
    description: 'Slow-cooked curries, tandoor breads and lassi, the way Delhi dhabas do it.',
    rating: 4.6, deliveryMinutes: 35, priceLevel: '₹₹',
    dishes: [
      ['Butter Chicken', 'Char-grilled chicken folded into tomato-cashew gravy', 329, 'Main', false, 1, true, '🍗'],
      ['Paneer Tikka Masala', 'Smoky paneer tikka simmered in spiced gravy', 269, 'Main', true, 2, true, '🧀'],
      ['Dal Makhani', 'Black urad simmered overnight with butter and cream', 219, 'Main', true, 0, false, '🍲'],
      ['Butter Naan (2 pc)', 'Tandoor-blistered naan brushed with white butter', 79, 'Breads', true, 0, false, '🫓'],
      ['Sweet Lassi', 'Thick churned curd, malai top, a pinch of cardamom', 99, 'Drinks', true, 0, false, '🥛'],
    ],
  },
  {
    name: 'Dosa Junction', cuisine: 'South Indian', area: 'University Road', emoji: '🥞',
    description: 'Crisp dosas off a cast-iron tawa, filter coffee and coconut chutney.',
    rating: 4.5, deliveryMinutes: 30, priceLevel: '₹',
    dishes: [
      ['Mysore Masala Dosa', 'Crisp dosa, fiery red chutney, potato palya', 149, 'Main', true, 2, true, '🥞'],
      ['Idli Sambar (3 pc)', 'Steamed idlis dunked in drumstick sambar', 119, 'Main', true, 0, false, '🍚'],
      ['Rava Onion Dosa', 'Golden semolina crepe with caramelised onion', 179, 'Main', true, 1, false, '🫓'],
      ['Filter Coffee', 'Strong peaberry decoction frothed with hot milk', 59, 'Drinks', true, 0, true, '☕'],
      ['Curd Rice', 'Cooling curd rice with tempering and pomegranate', 129, 'Main', true, 0, false, '🍚'],
    ],
  },
  {
    name: 'Dragon Wok', cuisine: 'Chinese', area: 'Mall Road', emoji: '🥡',
    description: 'Wok-tossed noodles, chilli garlic and dim sums, cooked to order.',
    rating: 4.4, deliveryMinutes: 40, priceLevel: '₹₹',
    dishes: [
      ['Hakka Noodles', 'Smoky wok noodles with peppers and spring onion', 199, 'Main', true, 1, true, '🍜'],
      ['Chilli Chicken Gravy', 'Battered chicken tossed in soy-chilli glaze', 289, 'Main', false, 3, true, '🍗'],
      ['Veg Manchurian', 'Crisp veggie balls in garlic-soy sauce', 219, 'Main', true, 2, false, '🥦'],
      ['Chicken Dim Sum (8 pc)', 'Steamed dumplings with chilli oil and soy', 249, 'Starters', false, 1, false, '🥟'],
      ['Burnt Garlic Fried Rice', 'Jasmine rice, burnt garlic, edamame', 209, 'Main', true, 1, false, '🍚'],
    ],
  },
  {
    name: 'Bella Pasta', cuisine: 'Italian', area: 'Civil Lines', emoji: '🍝',
    description: 'Fresh pasta, wood-fired pizza bases and tiramisu for the weekend mood.',
    rating: 4.7, deliveryMinutes: 45, priceLevel: '₹₹₹',
    dishes: [
      ['Alfredo Pasta', 'Silky parmesan cream, mushrooms, garlic bread', 349, 'Main', true, 0, true, '🍝'],
      ['Margherita Pizza', 'San Marzano tomato, fior di latte, basil', 399, 'Main', true, 0, true, '🍕'],
      ['Pesto Chicken Pasta', 'Basil pesto, grilled chicken, pine nuts', 379, 'Main', false, 0, false, '🍝'],
      ['Garlic Bread Supreme', 'Buttery loaf loaded with cheese and herbs', 179, 'Starters', true, 0, false, '🍞'],
      ['Tiramisu', 'Espresso-soaked sponge, mascarpone cloud', 199, 'Desserts', true, 0, true, '🍰'],
    ],
  },
  {
    name: 'Chaat Gali', cuisine: 'Street Food', area: 'Chowk', emoji: '😋',
    description: 'The lane-food legends: pani puri, tikki chaat and kulfi, packed to travel.',
    rating: 4.3, deliveryMinutes: 25, priceLevel: '₹',
    dishes: [
      ['Pani Puri (8 pc)', 'Crisp puris, five-flavour pani, ragda', 99, 'Chaat', true, 2, true, '😋'],
      ['Aloo Tikki Chaat', 'Crunchy tikki, yoghurt, tamarind, sev', 129, 'Chaat', true, 1, true, '🥔'],
      ['Samosa Chaat', 'Crushed samosa, chole, chutneys, onions', 119, 'Chaat', true, 2, false, '🥟'],
      ['Dahi Bhalla', 'Soft lentil dumplings under chilled dahi', 139, 'Chaat', true, 0, false, '🥣'],
      ['Kulfi Falooda', 'Dense malai kulfi over rose falooda', 149, 'Desserts', true, 0, false, '🍨'],
    ],
  },
  {
    name: 'Sweet Tooth Studio', cuisine: 'Desserts', area: 'University Road', emoji: '🧁',
    description: 'Small-batch cakes, brownies and shakes, baked every morning.',
    rating: 4.8, deliveryMinutes: 30, priceLevel: '₹₹',
    dishes: [
      ['Chocolate Truffle Cake (500g)', 'Dark chocolate layers, ganache finish', 499, 'Cakes', true, 0, true, '🎂'],
      ['Fudge Brownie (2 pc)', 'Warm-centred brownie with chocolate sauce', 159, 'Desserts', true, 0, true, '🍫'],
      ['KitKat Shake', 'Thick shake blended with chocolate wafer', 189, 'Shakes', true, 0, false, '🥤'],
      ['Red Velvet Pastry', 'Cream-cheese frosted red velvet slice', 149, 'Cakes', true, 0, false, '🍰'],
      ['Gulab Jamun (4 pc)', 'Hot syrup-soaked jamuns with rose water', 129, 'Desserts', true, 0, false, '🍩'],
    ],
  },
];

async function seed() {
  if (await Restaurant.countDocuments()) return;
  const hash = await bcrypt.hash('FoodFleet123!', 10);
  const customer = await User.create({ name: 'Demo Customer', email: 'demo@foodfleet.example', passwordHash: hash, role: 'customer' });
  const owner = await User.create({ name: 'Demo Restaurant Owner', email: 'demo-owner@foodfleet.example', passwordHash: hash, role: 'restaurant' });
  for (const m of MENUS) {
    const r = await Restaurant.create({ ...m, dishes: undefined, owner: owner._id });
    for (const [name, description, price, category, veg, spicy, popular, emoji] of m.dishes) {
      await MenuItem.create({ restaurant: r._id, name, description, price, category, veg, spicy, popular, emoji });
    }
  }
  console.log(`Seeded 6 restaurants. Demo customer: ${customer.email} / FoodFleet123!`);
}

module.exports = { seed };
