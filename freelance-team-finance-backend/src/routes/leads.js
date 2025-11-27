// routes/leads.js
const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

// CRUD
router.post('/', auth, allow('admin', 'owner', 'sales'), leadController.createLead);
router.get('/', auth, allow('admin', 'owner', 'sales'), leadController.getLeads);
router.get('/:leadId', auth, allow('admin', 'owner', 'sales'), leadController.getLeadById);
router.put('/:leadId', auth, allow('admin', 'owner', 'sales'), leadController.updateLead);
router.delete('/:leadId', auth, allow('admin', 'owner', 'sales'), leadController.deleteLead);

// Follow-ups
router.post('/:leadId/follow-ups', auth, allow('admin', 'owner', 'sales'), leadController.addFollowUp);
router.put('/:leadId/follow-ups/:followUpId', auth, allow('admin', 'owner', 'sales'), leadController.updateFollowUp);
router.delete('/:leadId/follow-ups/:followUpId', auth, allow('admin', 'owner', 'sales'), leadController.deleteFollowUp);

module.exports = router;
