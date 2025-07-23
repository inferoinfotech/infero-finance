const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/projectPaymentController');
const auth = require('../middleware/auth');

router.post('/', auth, paymentController.createPayment);
router.get('/project/:projectId', auth, paymentController.getPaymentsForProject);
router.get('/:paymentId', auth, paymentController.getPaymentById);
router.put('/:paymentId', auth, paymentController.updatePayment);
router.delete('/:paymentId', auth, paymentController.deletePayment);

module.exports = router;
