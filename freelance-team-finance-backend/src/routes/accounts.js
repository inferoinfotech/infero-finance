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


module.exports = router;
