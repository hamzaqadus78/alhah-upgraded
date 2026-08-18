const express = require('express');
const { submitContact } = require('../controllers/contact.controller');
const { requireFields } = require('../middleware/validateBody');

const router = express.Router();

router.post('/', requireFields(['name', 'email', 'message']), submitContact);

module.exports = router;
