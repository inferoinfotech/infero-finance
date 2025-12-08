const express = require('express');
const router = express.Router();
const expenseCategoryController = require('../controllers/expenseCategoryController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

// Get all categories
router.get('/', auth, allow('admin', 'owner'), expenseCategoryController.getCategories);

// Get single category
router.get('/:categoryId', auth, allow('admin', 'owner'), expenseCategoryController.getCategory);

// Create category
router.post('/', auth, allow('admin', 'owner'), expenseCategoryController.createCategory);

// Update category
router.put('/:categoryId', auth, allow('admin', 'owner'), expenseCategoryController.updateCategory);

// Delete category
router.delete('/:categoryId', auth, allow('admin', 'owner'), expenseCategoryController.deleteCategory);

module.exports = router;

