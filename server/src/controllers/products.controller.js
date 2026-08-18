const prisma = require('../lib/prisma');

async function listProducts(req, res, next) {
  try {
    const { category } = req.query;
    const products = await prisma.product.findMany({
      where: { active: true, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'asc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product || !product.active) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, getProduct };
