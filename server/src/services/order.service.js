const prisma = require('../lib/prisma');
const { HttpError } = require('../middleware/errorHandler');
const { formatOrderNumber } = require('../lib/orderNumber');
const emailService = require('./email.service');
const { isValidEmail } = require('../lib/validateEmail');
const { signCheckoutToken } = require('../lib/auth');

// The client's `required` attributes can be bypassed by calling the API
// directly, so contact-detail checks must be enforced here too, not just
// in the form.
async function validateCustomerDetails(customerEmail, customerPhone) {
  if (!customerEmail || !(await isValidEmail(customerEmail))) {
    throw new HttpError(400, "That email address doesn't look valid — please double-check it.");
  }
  if (!customerPhone || !customerPhone.trim()) {
    throw new HttpError(400, 'A phone number is required.');
  }
}

// Re-derives price/stock from the DB for each cart line — client-sent
// prices are never trusted, only { productId, qty } per line. Runs twice
// in the checkout-confirmation flow (once at request time for fast
// feedback, once for real at confirmation, since stock/price may have
// changed in between) without duplicating this logic.
async function validateCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'Cart is empty.');
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

  return { orderItemsData, subtotalCents, currency };
}

/**
 * Step 1 of checkout: validates everything for fast feedback (bad item,
 * out of stock, invalid email/phone all fail here immediately), then
 * emails a confirmation link. Nothing is written to the database — the
 * whole payload travels inside a signed, short-lived token instead of a
 * "pending" row, so an abandoned checkout leaves no trace at all.
 *
 * @param {{items: {productId: string, qty: number}[], customerName: string, customerEmail: string, customerPhone: string, shippingAddress: object, guestCode?: string}} payload
 */
async function beginCheckout(payload, userId) {
  const { items, customerName, customerEmail, customerPhone } = payload;
  await validateCustomerDetails(customerEmail, customerPhone);
  if (!customerName || !customerName.trim()) throw new HttpError(400, 'Name is required.');
  const { orderItemsData } = await validateCartItems(items);

  const token = signCheckoutToken(payload, userId);
  const link = `${process.env.FRONTEND_BASE}/checkout-confirm.html?token=${token}`;
  const itemsSummary = orderItemsData.map((i) => `${i.nameSnapshot} × ${i.qty}`).join('\n');
  await emailService.sendCheckoutVerificationEmail(customerEmail, customerName, link, itemsSummary);

  return { email: customerEmail };
}

/**
 * Step 2 of checkout (called after the customer clicks the confirmation
 * link and explicitly confirms): re-validates everything fresh — stock or
 * price may have changed since the email was sent — then actually creates
 * the order and decrements stock, atomically.
 *
 * @param {{items: {productId: string, qty: number}[], customerName: string, customerEmail: string, customerPhone: string, shippingAddress: object, guestCode?: string}} payload
 */
async function createOrderFromCart(payload, userId) {
  const { customerName, customerEmail, customerPhone, shippingAddress, guestCode } = payload;

  await validateCustomerDetails(customerEmail, customerPhone);
  const { orderItemsData, subtotalCents, currency } = await validateCartItems(payload.items);

  const shippingCents = 0; // TODO: shipping cost method not yet decided — plan Part B10, item 6.
  const totalCents = subtotalCents + shippingCents;

  // Order creation and stock decrement happen atomically.
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

module.exports = { beginCheckout, createOrderFromCart, getOrderStatus };
