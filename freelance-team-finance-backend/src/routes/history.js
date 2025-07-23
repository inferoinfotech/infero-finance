const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const auth = require('../middleware/auth');

// Get history logs (with optional filters)
router.get('/', auth, historyController.getHistory);

module.exports = router;
