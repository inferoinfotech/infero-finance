const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');

// All protected
router.post('/', auth, projectController.createProject);
router.get('/', auth, projectController.getProjects);
router.get('/:projectId', auth, projectController.getProjectById);
router.put('/:projectId', auth, projectController.updateProject);
router.delete('/:projectId', auth, projectController.deleteProject);

module.exports = router;
