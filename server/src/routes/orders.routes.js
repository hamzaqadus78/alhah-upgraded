const express = require('express');
const { createOrder, getOrderStatus } = require('../controllers/orders.controller');
const { requireFields } = require('../middleware/validateBody');
const { optionalUser } = require('../middleware/optionalUser');

const router = express.Router();

router.post('/', optionalUser, requireFields(['items', 'customerName', 'customerEmail', 'shippingAddress']), createOrder);
router.get('/:id/status', getOrderStatus);

module.exports = router;
