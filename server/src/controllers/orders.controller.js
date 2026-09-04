const orderService = require('../services/order.service');
const { HttpError } = require('../middleware/errorHandler');
const { verifyCheckoutToken } = require('../lib/auth');

async function createOrder(req, res, next) {
  try {
    const result = await orderService.beginCheckout(req.body, req.userId);
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
}

async function confirmOrder(req, res, next) {
  try {
    const { token } = req.body || {};
    if (!token) throw new HttpError(400, 'Confirmation token is required.');

    let payload, userId;
    try {
      ({ payload, userId } = verifyCheckoutToken(token));
    } catch {
      throw new HttpError(400, 'This confirmation link is invalid or has expired — please check out again.');
    }

    const order = await orderService.createOrderFromCart(payload, userId);
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

module.exports = { createOrder, confirmOrder, getOrderStatus };
