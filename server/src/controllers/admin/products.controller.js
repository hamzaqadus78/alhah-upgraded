const prisma = require('../../lib/prisma');
const { HttpError } = require('../../middleware/errorHandler');

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function listProducts(req, res, next) {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const { sku, name, category, description, priceCents, currency, stock, moq, images, active } = req.body || {};
    if (!sku || !name || !category || !description) {
      throw new HttpError(400, 'sku, name, category, and description are required.');
    }
    if (!Number.isInteger(priceCents) || priceCents < 0) throw new HttpError(400, 'priceCents must be a non-negative integer.');

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        slug: slugify(name),
        category,
        description,
        priceCents,
        currency: currency || 'USD',
        stock: Number.isInteger(stock) ? stock : 0,
        moq: Number.isInteger(moq) && moq > 0 ? moq : 1,
        images: Array.isArray(images) ? images : [],
        active: active !== false,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') return next(new HttpError(409, 'A product with that SKU already exists.'));
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const { name, category, description, priceCents, currency, stock, moq, images, active } = req.body || {};
    const data = {};
    if (name !== undefined) { data.name = name; data.slug = slugify(name); }
    if (category !== undefined) data.category = category;
    if (description !== undefined) data.description = description;
    if (priceCents !== undefined) {
      if (!Number.isInteger(priceCents) || priceCents < 0) throw new HttpError(400, 'priceCents must be a non-negative integer.');
      data.priceCents = priceCents;
    }
    if (currency !== undefined) data.currency = currency;
    if (stock !== undefined) data.stock = stock;
    if (moq !== undefined) data.moq = moq;
    if (images !== undefined) data.images = images;
    if (active !== undefined) data.active = active;

    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2025') return next(new HttpError(404, 'Product not found.'));
    next(err);
  }
}

// Soft-delete only — deactivate rather than hard-delete, since past orders
// reference products via OrderItem and must keep working.
async function deleteProduct(req, res, next) {
  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2025') return next(new HttpError(404, 'Product not found.'));
    next(err);
  }
}

module.exports = { listProducts, createProduct, updateProduct, deleteProduct };
