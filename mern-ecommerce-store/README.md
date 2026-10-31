# ShopKart — MERN E-commerce Store

Day 1 of a daily MERN project series. A complete e-commerce store built with
MongoDB, Express.js, React and Node.js.

## Features

- **Shop:** product list with search, category filter, sorting and pagination
- **Product pages:** detail view, stock display, quantity selection
- **Auth:** JWT register/login with bcrypt password hashing; the first
  registered account becomes admin
- **Cart & checkout:** cart saved in localStorage, checkout creates an order
  and decrements stock (mock payment — no real money moves)
- **Orders:** customers see their own orders; admins see all orders and can
  update order status
- **Admin dashboard:** revenue, order/product counts, low-stock list,
  add/delete products

## Tech stack

- Frontend: React 18, React Router, Vite
- Backend: Node.js, Express.js, Mongoose
- Database: MongoDB (MongoDB Atlas in production, in-memory MongoDB for
  local development when no `MONGO_URI` is set)
- Auth: JSON Web Tokens, bcryptjs

## Run locally

```bash
# Terminal 1 — API (port 5000)
cd server
npm install
cp .env.example .env   # optional: set MONGO_URI for a persistent database
npm run dev

# Terminal 2 — frontend (port 5173)
cd client
npm install
npm run dev
```

Then open http://localhost:5173. Register the first account to get admin
access, then visit **Admin** to add products and manage orders.

## API overview

| Method | Route | Access |
| --- | --- | --- |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Logged in |
| GET | `/api/products?search=&category=&sort=&page=` | Public |
| GET | `/api/products/:id` | Public |
| POST / PUT / DELETE | `/api/products` | Admin |
| POST | `/api/orders` | Logged in |
| GET | `/api/orders/mine` | Logged in |
| GET | `/api/orders` | Admin |
| PUT | `/api/orders/:id/status` | Admin |
| GET | `/api/admin/stats` | Admin |

## Notes

- Seed prices are in USD in the database; the frontend displays them in ₹
  (× 83) for an Indian audience. Change the multiplier in `Shop.jsx`,
  `ProductDetail.jsx`, `Cart.jsx` and `Orders.jsx` if you prefer USD.
- Product images are self-contained SVG placeholders generated in the seed
  data, so the demo works offline without any image-upload setup.
- No secrets are committed: copy `server/.env.example` to `server/.env`
  and set your own `JWT_SECRET` and `MONGO_URI`.
