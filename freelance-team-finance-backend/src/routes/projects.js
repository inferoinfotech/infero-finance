const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

// All protected
router.post('/', auth, allow('admin', 'owner'), projectController.createProject);
router.get('/', auth, allow('admin', 'owner'), projectController.getProjects);
router.get('/:projectId', auth, allow('admin', 'owner'), projectController.getProjectById);
router.put('/:projectId', auth, allow('admin', 'owner'), projectController.updateProject);
router.delete('/:projectId', auth, allow('admin', 'owner'), projectController.deleteProject);

module.exports = router;
