const prisma = require('../lib/prisma');
const payoneer = require('../services/payoneer.service');

// This webhook is the ONLY authoritative "paid" signal — the browser
// redirect back to order-confirmation.html must never mark an order paid
// on its own, since a customer can land on that URL without having paid.
async function handlePayoneerWebhook(req, res, next) {
  try {
    const valid = payoneer.verifyWebhookSignature(req);
    if (!valid) return res.status(401).json({ error: 'Invalid signature' });

    const { payoneerSessionId, payoneerPaymentId, status } = req.body; // exact shape TBD per real Payoneer payload
    const order = await prisma.order.findUnique({ where: { payoneerSessionId } });
    if (!order) return res.status(404).json({ error: 'Order not found for session' });

    if (status === 'PAID' && order.status !== 'PAID') {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAID', payoneerPaymentId, paidAt: new Date() },
        }),
        ...(await buildStockDecrements(order.id)),
      ]);
    } else if (status === 'FAILED') {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
    }

    // Respond fast; webhook senders retry on non-2xx.
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
}

async function buildStockDecrements(orderId) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  return items.map((item) =>
    prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.qty } },
    })
  );
}

module.exports = { handlePayoneerWebhook };
