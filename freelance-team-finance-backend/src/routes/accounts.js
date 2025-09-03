const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const auth = require('../middleware/auth');

// All endpoints protected
router.post('/', auth, accountController.createAccount);
router.get('/', auth, accountController.getAccounts);
router.put('/:accountId', auth, accountController.updateAccount);
router.delete('/:accountId', auth, accountController.deleteAccount);
router.get('/:accountId/statement', auth, accountController.getAccountStatement);


module.exports = router;
