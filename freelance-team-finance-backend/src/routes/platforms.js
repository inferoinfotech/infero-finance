const express = require('express');
const router = express.Router();
const platformController = require('../controllers/platformController');
const auth = require('../middleware/auth');

router.post('/', auth, platformController.createPlatform);
router.get('/', auth, platformController.getPlatforms);
router.put('/:platformId', auth, platformController.updatePlatform);
router.delete('/:platformId', auth, platformController.deletePlatform);

module.exports = router;
