const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

router.get('/', auth, allow('admin', 'owner'), notificationController.getNotifications);
router.put('/:notificationId/read', auth, allow('admin', 'owner'), notificationController.markAsRead);

module.exports = router;
