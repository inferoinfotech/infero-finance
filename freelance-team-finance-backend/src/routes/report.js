// routes/report.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reportController = require('../controllers/reportController');
const { allow } = require('../middleware/roles');

// Expenses (all types)
router.get('/expenses', auth, reportController.expenses);

// General expenses only (type === 'general')
router.get('/general-expenses', auth, reportController.generalExpenses);

router.get('/income', auth, reportController.income);

module.exports = router;
