const prisma = require('../lib/prisma');
const { HttpError } = require('../middleware/errorHandler');

/**
 * Builds an order from a cart payload, re-deriving price/stock from the DB.
 * Client-sent prices are never trusted — only { productId, qty } per line.
 *
 * @param {{items: {productId: string, qty: number}[], customerName: string, customerEmail: string, customerPhone?: string, shippingAddress: object}} payload
 */
async function createOrderFromCart(payload) {
  const { items, customerName, customerEmail, customerPhone, shippingAddress } = payload;

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

  const shippingCents = 0; // TODO: shipping cost method not yet decided — plan Part B10, item 6.
  const totalCents = subtotalCents + shippingCents;

  const order = await prisma.order.create({
    data: {
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
  });

  return order;
}

async function getOrderStatus(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      currency: true,
      totalCents: true,
      items: { select: { nameSnapshot: true, qty: true, priceCentsSnapshot: true } },
    },
  });
  if (!order) throw new HttpError(404, 'Order not found.');
  return order;
}

module.exports = { createOrderFromCart, getOrderStatus };
