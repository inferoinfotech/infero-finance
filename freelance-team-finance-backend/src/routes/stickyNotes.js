const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stickyNoteController = require('../controllers/stickyNoteController');

// Auth only (available for all roles)
router.get('/', auth, stickyNoteController.getStickyNotes);
router.post('/', auth, stickyNoteController.createStickyNote);
router.patch('/reorder', auth, stickyNoteController.reorderStickyNotes);
router.put('/:id', auth, stickyNoteController.updateStickyNote);
router.delete('/:id', auth, stickyNoteController.deleteStickyNote);

module.exports = router;

