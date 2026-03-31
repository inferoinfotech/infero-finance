const express = require('express')
const router = express.Router()

const assetTypeController = require('../controllers/assetTypeController')
const auth = require('../middleware/auth')
const { allow } = require('../middleware/roles')

router.get('/', auth, allow('admin', 'owner'), assetTypeController.getAssetTypes)
router.get('/:typeId', auth, allow('admin', 'owner'), assetTypeController.getAssetType)

router.post('/', auth, allow('admin', 'owner'), assetTypeController.createAssetType)
router.put('/:typeId', auth, allow('admin', 'owner'), assetTypeController.updateAssetType)
router.delete('/:typeId', auth, allow('admin', 'owner'), assetTypeController.deleteAssetType)

module.exports = router

