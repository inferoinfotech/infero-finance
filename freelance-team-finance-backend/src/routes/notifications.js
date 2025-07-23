const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.get('/', auth, notificationController.getNotifications);
router.put('/:notificationId/read', auth, notificationController.markAsRead);

module.exports = router;
