const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');
const taskController = require('../controllers/taskController');

router.post('/', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.createTask);
router.get('/', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.getTasks);
router.get('/archived', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.getArchivedTasks);
router.get('/archived/:id', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.getArchivedTaskById);
router.post('/:id/archive', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.archiveTask);
router.get('/:id/comments', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.getComments);
router.post('/:id/comments', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.addComment);
router.get('/:id/activity', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.getActivity);
router.get('/:id', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.getTaskById);
router.put('/:id', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.updateTask);
router.delete('/:id', auth, allow('admin', 'owner', 'sales', 'developer'), taskController.deleteTask);

module.exports = router;
