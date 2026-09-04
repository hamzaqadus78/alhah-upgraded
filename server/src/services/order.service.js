const prisma = require('../lib/prisma');
const { HttpError } = require('../middleware/errorHandler');
const { formatOrderNumber } = require('../lib/orderNumber');
const emailService = require('./email.service');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Builds an order from a cart payload, re-deriving price/stock from the DB.
 * Client-sent prices are never trusted — only { productId, qty } per line.
 *
 * @param {{items: {productId: string, qty: number}[], customerName: string, customerEmail: string, customerPhone: string, shippingAddress: object, guestCode?: string}} payload
 */
async function createOrderFromCart(payload, userId) {
  const { items, customerName, customerEmail, customerPhone, shippingAddress, guestCode } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'Cart is empty.');
  }
  // The client's `required` attributes can be bypassed by calling the API
  // directly, so these must be enforced here too, not just in the form.
  if (!customerEmail || !EMAIL_RE.test(customerEmail)) {
    throw new HttpError(400, 'A valid email address is required.');
  }
  if (!customerPhone || !customerPhone.trim()) {
    throw new HttpError(400, 'A phone number is required.');
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productById = new Map(products.map((p) => [p.id, p]));

  let subtotalCents = 0;
  const orderItemsData = [];
  let currency = null;

  for (const line of items) {
    const product = productById.get(line.productId);
    if (!product || !product.active) {
      throw new HttpError(400, `Product ${line.productId} is not available.`);
    }
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new HttpError(400, `Invalid quantity for ${product.name}.`);
    }
    if (qty < product.moq) {
      throw new HttpError(400, `${product.name} has a minimum order quantity of ${product.moq}.`);
    }
    if (qty > product.stock) {
      throw new HttpError(400, `${product.name} has insufficient stock (${product.stock} available).`);
    }
    if (currency === null) currency = product.currency;
    else if (currency !== product.currency) {
      throw new HttpError(400, 'All items in an order must use the same currency.');
    }

    subtotalCents += product.priceCents * qty;
    orderItemsData.push({
      productId: product.id,
      nameSnapshot: product.name,
      priceCentsSnapshot: product.priceCents,
      qty,
    });
  }

  const shippingCents = 0; // TODO: shipping cost method not yet decided — plan Part B10, item 6.
  const totalCents = subtotalCents + shippingCents;

  // Order creation and stock decrement happen atomically — there's no
  // separate payment-confirmation step anymore, so placing the order is
  // the moment stock gets reserved.
  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        userId: userId || null,
        guestCode: userId ? null : (guestCode || null),
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        currency,
        subtotalCents,
        shippingCents,
        totalCents,
        items: { create: orderItemsData },
      },
      include: { items: true },
    }),
    ...orderItemsData.map((item) =>
      prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.qty } } })
    ),
  ]);

  // Never let a notification-email hiccup fail the order itself — the
  // order is already safely in the database at this point.
  try {
    await emailService.sendOrderPlacedEmail(order);
  } catch (err) {
    console.error('Order-placed notification email failed:', err.message);
  }

  return { ...order, orderNumber: formatOrderNumber(order.orderSeq) };
}

async function getOrderStatus(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderSeq: true,
      status: true,
      currency: true,
      totalCents: true,
      items: { select: { nameSnapshot: true, qty: true, priceCentsSnapshot: true } },
    },
  });
  if (!order) throw new HttpError(404, 'Order not found.');
  return { ...order, orderNumber: formatOrderNumber(order.orderSeq) };
}

module.exports = { createOrderFromCart, getOrderStatus };
