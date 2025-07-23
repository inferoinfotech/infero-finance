const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summaryController');
const auth = require('../middleware/auth');

router.get('/team', auth, summaryController.getTeamSummary);
router.get('/user', auth, summaryController.getUserSummary);

module.exports = router;
