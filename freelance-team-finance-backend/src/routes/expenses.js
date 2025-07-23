const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const auth = require('../middleware/auth');

router.post('/', auth, expenseController.createExpense);
router.get('/', auth, expenseController.getExpenses);
router.put('/:expenseId', auth, expenseController.updateExpense);
router.delete('/:expenseId', auth, expenseController.deleteExpense);

module.exports = router;
