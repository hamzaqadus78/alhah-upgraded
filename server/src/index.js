require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');

const productsRoutes = require('./routes/products.routes');
const ordersRoutes = require('./routes/orders.routes');
const contactRoutes = require('./routes/contact.routes');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// credentials:true is required for the browser to send/receive the
// httpOnly session cookies cross-origin (API on :3000, site on :8080).
// CORS_ALLOWED_ORIGIN can be a comma-separated list — needed so local dev
// (http://localhost:8080) and the deployed site can both reach this API
// without having to keep swapping the env var back and forth.
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGIN || 'https://alhahindustries.com')
  .split(',')
  .map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
// Default 100kb limit is too small once a product's `images` array carries
// base64 data URIs (see admin/upload.controller.js) instead of plain URLs.
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ALHAH shop API listening on port ${port}`));
