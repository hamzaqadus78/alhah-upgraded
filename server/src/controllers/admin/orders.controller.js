const prisma = require('../../lib/prisma');
const { HttpError } = require('../../middleware/errorHandler');
const { formatOrderNumber } = require('../../lib/orderNumber');

const VALID_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED'];

async function listOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: { select: { nameSnapshot: true, qty: true, priceCentsSnapshot: true } },
        user: { select: { username: true, email: true } },
      },
    });
    res.json(orders.map((o) => ({ ...o, orderNumber: formatOrderNumber(o.orderSeq) })));
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      throw new HttpError(400, `status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status, ...(status === 'PAID' ? { paidAt: new Date() } : {}) },
    });
    res.json(order);
  } catch (err) {
    if (err.code === 'P2025') return next(new HttpError(404, 'Order not found.'));
    next(err);
  }
}

// Permanent — cannot be undone. OrderItem.order is onDelete: Cascade
// (schema.prisma), so the order's line items are removed along with it.
async function deleteOrder(req, res, next) {
  try {
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'P2025') return next(new HttpError(404, 'Order not found.'));
    next(err);
  }
}

module.exports = { listOrders, updateOrderStatus, deleteOrder };
