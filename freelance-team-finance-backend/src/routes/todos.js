const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const todoController = require('../controllers/todoController');

// Auth only (available for all roles)
router.get('/', auth, todoController.getTodos);
router.post('/', auth, todoController.createTodo);
router.patch('/reorder', auth, todoController.reorderTodos);
router.put('/:id', auth, todoController.updateTodo);
router.delete('/:id', auth, todoController.deleteTodo);

module.exports = router;

