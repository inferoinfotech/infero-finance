const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

router.post('/', auth, allow('admin', 'owner'), expenseController.createExpense);
router.get('/', auth, allow('admin', 'owner'), expenseController.getExpenses);
router.put('/:expenseId', auth, allow('admin', 'owner'), expenseController.updateExpense);
router.delete('/:expenseId', auth, allow('admin', 'owner'), expenseController.deleteExpense);

module.exports = router;
