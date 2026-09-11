const express = require('express');
const { getSettings } = require('../controllers/admin/settings.controller');

const router = express.Router();

// Public — read-only. Writing goes through /api/admin/settings/:scope
// (requireAdmin), mounted separately in admin.routes.js.
router.get('/:scope', getSettings);

module.exports = router;
