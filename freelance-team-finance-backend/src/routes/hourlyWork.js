const express = require('express');
const router = express.Router();
const hourlyWorkController = require('../controllers/hourlyWorkController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

router.post('/', auth, allow('admin', 'owner'), hourlyWorkController.addHourlyWork);
router.get('/project/:projectId', auth, allow('admin', 'owner'), hourlyWorkController.getHourlyWorkForProject);
router.put('/:logId', auth, allow('admin', 'owner'), hourlyWorkController.updateHourlyWork);
router.delete('/:logId', auth, allow('admin', 'owner'), hourlyWorkController.deleteHourlyWork);

module.exports = router;
