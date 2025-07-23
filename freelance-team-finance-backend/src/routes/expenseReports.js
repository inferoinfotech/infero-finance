const express = require('express');
const router = express.Router();
const expenseReportController = require('../controllers/expenseReportController');
const auth = require('../middleware/auth');

// CSV
router.get('/csv', auth, expenseReportController.exportExpensesCSV);
// Excel
router.get('/excel', auth, expenseReportController.exportExpensesExcel);
// PDF
router.get('/pdf', auth, expenseReportController.exportExpensesPDF);

module.exports = router;
