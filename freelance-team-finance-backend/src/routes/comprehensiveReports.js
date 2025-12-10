const express = require('express');
const router = express.Router();
const reportController = require('../controllers/comprehensiveReportController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

// Income/Payment Reports
router.get('/income/csv', auth, allow('admin', 'owner'), reportController.exportIncomeCSV);
router.get('/income/excel', auth, allow('admin', 'owner'), reportController.exportIncomeExcel);
router.get('/income/pdf', auth, allow('admin', 'owner'), reportController.exportIncomePDF);

// Expense Reports
router.get('/expense/csv', auth, allow('admin', 'owner'), reportController.exportExpenseCSV);
router.get('/expense/excel', auth, allow('admin', 'owner'), reportController.exportExpenseExcel);
router.get('/expense/pdf', auth, allow('admin', 'owner'), reportController.exportExpensePDF);

// Project Reports
router.get('/project/csv', auth, allow('admin', 'owner'), reportController.exportProjectCSV);
router.get('/project/excel', auth, allow('admin', 'owner'), reportController.exportProjectExcel);
router.get('/project/pdf', auth, allow('admin', 'owner'), reportController.exportProjectPDF);

// Account/Transaction Reports
router.get('/account/csv', auth, allow('admin', 'owner'), reportController.exportAccountCSV);
router.get('/account/excel', auth, allow('admin', 'owner'), reportController.exportAccountExcel);
router.get('/account/pdf', auth, allow('admin', 'owner'), reportController.exportAccountPDF);

// Profit & Loss Reports
router.get('/profit-loss/csv', auth, allow('admin', 'owner'), reportController.exportProfitLossCSV);
router.get('/profit-loss/excel', auth, allow('admin', 'owner'), reportController.exportProfitLossExcel);
router.get('/profit-loss/pdf', auth, allow('admin', 'owner'), reportController.exportProfitLossPDF);

module.exports = router;

