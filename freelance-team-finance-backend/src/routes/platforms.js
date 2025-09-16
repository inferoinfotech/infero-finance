const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platformController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

router.post('/', auth, allow('admin', 'owner'), platformController.createPlatform);
router.get('/', auth, platformController.getPlatforms);
router.put('/:platformId', auth, allow('admin', 'owner'), platformController.updatePlatform);
router.delete('/:platformId', auth, allow('admin', 'owner'), platformController.deletePlatform);

module.exports = router;
