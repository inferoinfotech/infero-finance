const express = require('express');
const router = express.Router();
const hourlyWorkController = require('../controllers/hourlyWorkController');
const auth = require('../middleware/auth');

router.post('/', auth, hourlyWorkController.addHourlyWork);
router.get('/project/:projectId', auth, hourlyWorkController.getHourlyWorkForProject);
router.put('/:logId', auth, hourlyWorkController.updateHourlyWork);
router.delete('/:logId', auth, hourlyWorkController.deleteHourlyWork);

module.exports = router;
