const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Product = require('./models/Product');
const productsSeed = require('./seed/products');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mern-ecommerce-store' }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Admin dashboard stats: revenue, order count, product count, low-stock list.
app.get('/api/admin/stats', require('./middleware/auth').protect, require('./middleware/auth').adminOnly, async (req, res) => {
  const Order = require('./models/Order');
  const orders = await Order.find();
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const lowStock = await Product.find({ stock: { $lt: 20 } }).sort({ stock: 1 }).limit(10);
  res.json({ revenue: Number(revenue.toFixed(2)), orders: orders.length, products: await Product.countDocuments(), lowStock });
});

async function connectDb() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB (MONGO_URI)');
    return;
  }
  // Local development fallback: an in-memory MongoDB, so the app runs with
  // zero setup. Production should always set MONGO_URI (e.g. MongoDB Atlas).
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('Connected to in-memory MongoDB (local dev only — set MONGO_URI for persistent data)');
}

async function start() {
  await connectDb();
  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany(productsSeed);
    console.log(`Seeded ${productsSeed.length} products`);
  }
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

start().catch((err) => { console.error(err); process.exit(1); });
