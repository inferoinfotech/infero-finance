const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

// Get history logs (with optional filters)
router.get('/', auth, allow('admin', 'owner'), historyController.getHistory);

module.exports = router;
