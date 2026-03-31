const express = require('express')
const router = express.Router()

const assetController = require('../controllers/assetController')
const auth = require('../middleware/auth')
const { allow } = require('../middleware/roles')

router.post('/', auth, allow('admin', 'owner'), assetController.createAsset)
router.get('/', auth, allow('admin', 'owner'), assetController.getAssets)
router.get('/summary', auth, allow('admin', 'owner'), assetController.getAssetsSummary)
router.put('/:assetId', auth, allow('admin', 'owner'), assetController.updateAsset)
router.delete('/:assetId', auth, allow('admin', 'owner'), assetController.deleteAsset)

module.exports = router

