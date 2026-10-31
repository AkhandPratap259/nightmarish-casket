const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const products = require('./products');

dotenv.config({ path: require('path').join(__dirname, '..', '..', '.env') });

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('Set MONGO_URI in server/.env before running the standalone seed script.');
  await mongoose.connect(uri);
  await Product.deleteMany();
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err.message); process.exit(1); });
