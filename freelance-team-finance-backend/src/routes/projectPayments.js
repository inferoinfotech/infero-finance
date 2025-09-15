const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/projectPaymentController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

router.post('/', auth, allow('admin', 'owner'), paymentController.createPayment);
router.get('/project/:projectId', auth, allow('admin', 'owner'), paymentController.getPaymentsForProject);
router.get('/:paymentId', auth, allow('admin', 'owner'), paymentController.getPaymentById);
router.put('/:paymentId', auth, allow('admin', 'owner'), paymentController.updatePayment);
router.delete('/:paymentId', auth, allow('admin', 'owner'), paymentController.deletePayment);

module.exports = router;
