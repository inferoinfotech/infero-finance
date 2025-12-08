const ExpenseCategory = require('../models/ExpenseCategory');
const Expense = require('../models/Expense');
const { logHistory } = require('../utils/historyLogger');

// Get all expense categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await ExpenseCategory.find()
      .populate('createdBy', 'name email')
      .sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
};

// Create a new expense category
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category with same name already exists
    const existing = await ExpenseCategory.findOne({ 
      name: name.trim() 
    });
    if (existing) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const category = await ExpenseCategory.create({
      name: name.trim(),
      description: description?.trim() || '',
      createdBy: req.user.userId
    });

    // Log category creation
    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'Category',
      entityId: category._id,
      newValue: category.toObject(),
      description: `Created expense category: ${category.name}`
    });

    res.status(201).json({ category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }
    next(err);
  }
};

// Update an expense category
exports.updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if another category with same name exists
    const existing = await ExpenseCategory.findOne({ 
      name: name.trim(),
      _id: { $ne: categoryId }
    });
    if (existing) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    // Get old value
    const oldCategory = await ExpenseCategory.findById(categoryId);
    if (!oldCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await ExpenseCategory.findByIdAndUpdate(
      categoryId,
      {
        name: name.trim(),
        description: description?.trim() || '',
        updatedAt: Date.now()
      },
      { new: true }
    );

    // Log category update
    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'Category',
      entityId: categoryId,
      oldValue: oldCategory.toObject(),
      newValue: category.toObject(),
      description: `Updated expense category: ${category.name}`
    });

    res.json({ category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }
    next(err);
  }
};

// Delete an expense category
exports.deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    // Check if category is being used by any expenses
    const expensesUsingCategory = await Expense.countDocuments({ category: categoryId });
    if (expensesUsingCategory > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It is being used by ${expensesUsingCategory} expense(s). Please remove the category from those expenses first.` 
      });
    }

    const deleted = await ExpenseCategory.findByIdAndDelete(categoryId);
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Log category deletion
    await logHistory({
      userId: req.user.userId,
      action: 'delete',
      entityType: 'Category',
      entityId: categoryId,
      oldValue: deleted.toObject(),
      description: `Deleted expense category: ${deleted.name}`
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Get a single category by ID
exports.getCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const category = await ExpenseCategory.findById(categoryId)
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ category });
  } catch (err) {
    next(err);
  }
};

