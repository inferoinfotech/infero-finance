// routes/leads.js
const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const auth = require('../middleware/auth');

// CRUD
router.post('/', auth, leadController.createLead);
router.get('/', auth, leadController.getLeads);
router.get('/:leadId', auth, leadController.getLeadById);
router.put('/:leadId', auth, leadController.updateLead);
router.delete('/:leadId', auth, leadController.deleteLead);

// Follow-ups
router.post('/:leadId/follow-ups', auth, leadController.addFollowUp);

module.exports = router;
