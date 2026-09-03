const orderService = require('../services/order.service');

async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrderFromCart(req.body, req.userId);
    res.status(201).json({ orderId: order.id, orderNumber: order.orderNumber, totalCents: order.totalCents, currency: order.currency });
  } catch (err) {
    next(err);
  }
}

async function getOrderStatus(req, res, next) {
  try {
    const order = await orderService.getOrderStatus(req.params.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, getOrderStatus };
