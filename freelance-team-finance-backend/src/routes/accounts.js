const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

// All endpoints protected
router.post('/', auth, allow('admin', 'owner'), accountController.createAccount);
router.get('/', auth, allow('admin', 'owner'), accountController.getAccounts);
router.put('/:accountId', auth, allow('admin', 'owner'), accountController.updateAccount);
router.delete('/:accountId', auth, allow('admin', 'owner'), accountController.deleteAccount);
router.get('/:accountId/statement', auth, allow('admin', 'owner'), accountController.getAccountStatement);
router.get('/:accountId/statement/export/csv', auth, allow('admin', 'owner'), accountController.exportStatementCSV);
router.get('/:accountId/statement/export/excel', auth, allow('admin', 'owner'), accountController.exportStatementExcel);
router.get('/:accountId/statement/export/pdf', auth, allow('admin', 'owner'), accountController.exportStatementPDF);
router.post('/transfer', auth, allow('admin', 'owner'), accountController.transferMoney);

module.exports = router;
