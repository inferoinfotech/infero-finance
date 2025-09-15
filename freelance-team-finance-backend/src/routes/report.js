// routes/report.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const reportController = require('../controllers/reportController');
const { allow } = require('../middleware/roles');

// Expenses (all types)
router.get('/expenses', allow('admin', 'owner'), auth, reportController.expenses);

// General expenses only (type === 'general')
router.get('/general-expenses', allow('admin', 'owner'), auth, reportController.generalExpenses);

router.get('/income', allow('admin', 'owner'), auth, reportController.income);

module.exports = router;
