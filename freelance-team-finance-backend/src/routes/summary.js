const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

router.get('/team', auth, allow('admin', 'owner'), summaryController.getTeamSummary);
router.get('/user', auth, allow('admin', 'owner'), summaryController.getUserSummary);


module.exports = router;
