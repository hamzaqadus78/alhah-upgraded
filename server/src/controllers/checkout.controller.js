const prisma = require('../lib/prisma');
const payoneer = require('../services/payoneer.service');
const { HttpError } = require('../middleware/errorHandler');

const FRONTEND_BASE = process.env.FRONTEND_BASE || 'http://localhost:8080';

async function createCheckoutSession(req, res, next) {
  try {
    const { orderId } = req.body;
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new HttpError(404, 'Order not found.');
    if (order.status !== 'PENDING') throw new HttpError(400, 'Order is not payable in its current state.');

    // DEMO_MODE lets you walk through the full shop → checkout → confirmation
    // flow before Payoneer is set up. It's off unless explicitly enabled and
    // never touches real money — it just marks the order PAID directly and
    // sends the browser straight to order-confirmation.html. Remove this
    // branch (or leave DEMO_MODE unset) once real Payoneer credentials land.
    if (process.env.DEMO_MODE === 'true' && !payoneer.configured()) {
      await runStockDecrements(order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt: new Date(), payoneerSessionId: `demo_${order.id}` },
      });
      return res.json({ redirectUrl: `${FRONTEND_BASE}/order-confirmation.html?order=${order.id}&demo=1` });
    }

    const session = await payoneer.createCheckoutSession(order);

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'AWAITING_PAYMENT', payoneerSessionId: session.sessionId },
    });

    res.json({ redirectUrl: session.redirectUrl });
  } catch (err) {
    next(err);
  }
}

async function runStockDecrements(orderId) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  await prisma.$transaction(
    items.map((item) =>
      prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.qty } } })
    )
  );
}

module.exports = { createCheckoutSession };
