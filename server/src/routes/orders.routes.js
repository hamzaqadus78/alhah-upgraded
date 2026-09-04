const express = require('express');
const { createOrder, confirmOrder, getOrderStatus } = require('../controllers/orders.controller');
const { requireFields } = require('../middleware/validateBody');
const { optionalUser } = require('../middleware/optionalUser');

const router = express.Router();

router.post('/', optionalUser, requireFields(['items', 'customerName', 'customerEmail', 'customerPhone', 'shippingAddress']), createOrder);
router.post('/confirm', requireFields(['token']), confirmOrder);
router.get('/:id/status', getOrderStatus);

module.exports = router;
