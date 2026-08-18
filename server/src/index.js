require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const productsRoutes = require('./routes/products.routes');
const ordersRoutes = require('./routes/orders.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const webhooksRoutes = require('./routes/webhooks.routes');
const contactRoutes = require('./routes/contact.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ALLOWED_ORIGIN || 'https://alhahindustries.com' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/contact', contactRoutes);

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ALHAH shop API listening on port ${port}`));
