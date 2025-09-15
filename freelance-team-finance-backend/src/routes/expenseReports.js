const express = require('express');
const router = express.Router();
const expenseReportController = require('../controllers/expenseReportController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

// CSV
router.get('/csv', auth, allow('admin', 'owner'), expenseReportController.exportExpensesCSV);
// Excel
router.get('/excel', auth, allow('admin', 'owner'), expenseReportController.exportExpensesExcel);
// PDF
router.get('/pdf', auth, allow('admin', 'owner'), expenseReportController.exportExpensesPDF);

module.exports = router;
