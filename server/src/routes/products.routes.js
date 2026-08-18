const express = require('express');
const { listProducts, getProduct } = require('../controllers/products.controller');

const router = express.Router();

router.get('/', listProducts);
router.get('/:slug', getProduct);

module.exports = router;
