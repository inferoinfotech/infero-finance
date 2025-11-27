// controllers/leadController.js
const Lead = require('../models/Lead');
const mongoose = require('mongoose');

const leadPopulate = [
  { path: 'leadBy', select: 'name email' },
  { path: 'assignedTo', select: 'name email' },
  { path: 'platform', select: 'name' },
  { path: 'followUps.addedBy', select: 'name email' },
];

const populateLeadQuery = (query) => query
  .populate(leadPopulate[0])
  .populate(leadPopulate[1])
  .populate(leadPopulate[2])
  .populate(leadPopulate[3]);

const ensureFollowUpObjectIds = (lead) => {
  if (!lead || !Array.isArray(lead.followUps) || !lead.followUps.length) return false;
  let dirty = false;
  lead.followUps.forEach((fu) => {
    if (!fu._id) {
      fu._id = new mongoose.Types.ObjectId();
      dirty = true;
    }
  });
  if (dirty) {
    lead.markModified('followUps');
  }
  return dirty;
};

const findLeadFollowUpIndex = (followUps, identifier) => {
  if (!Array.isArray(followUps)) return -1;
  if (mongoose.isValidObjectId(identifier)) {
    const idx = followUps.findIndex((fu) => fu._id && fu._id.toString() === identifier);
    if (idx !== -1) return idx;
  }
  if (/^\d+$/.test(identifier)) {
    const numeric = Number(identifier);
    if (numeric >= 0 && numeric < followUps.length) return numeric;
  }
  return -1;
};

exports.createLead = async (req, res, next) => {
  try {
    const {
      clientName,
      companyName,
      clientEmail,
      clientMobile,
      projectDetails,
      platform,
      priority,
      estimatedBudget,
      stage,
      address,
      tags,
      nextFollowUpDate,
      notes,
      assignedTo
    } = req.body;

    const payload = {
      leadBy: req.userId, // ✅ always string ObjectId
      clientName,
      companyName,
      clientEmail,
      clientMobile,
      projectDetails,
      platform,
      priority,
      estimatedBudget,
      stage,
      address,
      tags,
      nextFollowUpDate,
      notes,
      assignedTo: assignedTo || req.userId, // fallback
    };

    const lead = await Lead.create(payload);
    res.status(201).json({ lead });
  } catch (err) {
    next(err);
  }
};


exports.getLeads = async (req, res, next) => {
  try {
    const {
      q,                  // free-text search
      stage,              // filter by stage
      priority,           // filter by priority
      platform,           // platform id
      assignedTo,         // user id
      nextFrom, nextTo,   // nextFollowUpDate range
      limit = 50,
      page = 1,
    } = req.query;

    const filter = {};
    if (stage) filter.stage = stage;
    if (priority) filter.priority = priority;
    if (platform) filter.platform = platform;
    if (assignedTo) filter.assignedTo = assignedTo;

    if (nextFrom || nextTo) {
      filter.nextFollowUpDate = {};
      if (nextFrom) filter.nextFollowUpDate.$gte = new Date(nextFrom);
      if (nextTo)   filter.nextFollowUpDate.$lte = new Date(nextTo);
    }

    let query = Lead.find(filter)
      .populate('leadBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('platform', 'name')
      .sort({ updatedAt: -1 });

    if (q) {
      query = query.find({ $text: { $search: q } });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      query.skip(skip).limit(Number(limit)),
      Lead.countDocuments(q ? { ...filter, $text: { $search: q } } : filter),
    ]);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
};

exports.getLeadById = async (req, res, next) => {
  try {
    const lead = await populateLeadQuery(Lead.findById(req.params.leadId));

    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const mutated = ensureFollowUpObjectIds(lead);
    if (mutated) {
      await lead.save();
      await lead.populate(leadPopulate);
    }
    res.json({ lead });
  } catch (err) {
    next(err);
  }
};

exports.updateLead = async (req, res, next) => {
  try {
    const updated = await populateLeadQuery(Lead.findByIdAndUpdate(
      req.params.leadId,
      req.body,
      { new: true }
    ));

    if (!updated) return res.status(404).json({ error: 'Lead not found' });
    const mutated = ensureFollowUpObjectIds(updated);
    if (mutated) {
      await updated.save();
      await updated.populate(leadPopulate);
    }
    res.json({ lead: updated });
  } catch (err) {
    next(err);
  }
};

exports.deleteLead = async (req, res, next) => {
  try {
    const deleted = await Lead.findByIdAndDelete(req.params.leadId);
    if (!deleted) return res.status(404).json({ error: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    next(err);
  }
};

exports.addFollowUp = async (req, res, next) => {
  try {
    const leadId = req.params.leadId;
    const addedBy = req.userId; // <-- use the id from token ONLY

    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({ error: 'Invalid leadId' });
    }
    if (!mongoose.isValidObjectId(addedBy)) {
      return res.status(400).json({ error: 'Invalid userId in token' });
    }

    // Whitelist body fields (ignore any addedBy passed by client)
    const { date, clientResponse = '', notes = '', nextFollowUpDate } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'date is required (ISO string)' });
    }

    const followUp = {
      date: new Date(date),
      clientResponse,
      notes,
      addedBy: new mongoose.Types.ObjectId(addedBy), // <-- ObjectId
    };

    const update = {
      $push: { followUps: followUp },
      ...(nextFollowUpDate ? { $set: { nextFollowUpDate: new Date(nextFollowUpDate) } } : {})
    };

    const lead = await populateLeadQuery(Lead.findByIdAndUpdate(
      leadId,
      update,
      { new: true }
    ));

    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const mutated = ensureFollowUpObjectIds(lead);
    if (mutated) {
      await lead.save();
      await lead.populate(leadPopulate);
    }

    res.status(201).json({ lead });
  } catch (err) {
    next(err);
  }
};

exports.updateFollowUp = async (req, res, next) => {
  try {
    const { leadId, followUpId } = req.params;
    const { date, clientResponse = '', notes = '', nextFollowUpDate } = req.body;

    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({ error: 'Invalid leadId' });
    }

    const lead = await populateLeadQuery(Lead.findById(leadId));
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const idx = findLeadFollowUpIndex(lead.followUps, followUpId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    if (date) lead.followUps[idx].date = new Date(date);
    if (clientResponse !== undefined) lead.followUps[idx].clientResponse = clientResponse;
    if (notes !== undefined) lead.followUps[idx].notes = notes;

    if (nextFollowUpDate) {
      lead.nextFollowUpDate = new Date(nextFollowUpDate);
    } else if (nextFollowUpDate === null || nextFollowUpDate === '') {
      lead.nextFollowUpDate = undefined;
    }

    ensureFollowUpObjectIds(lead);
    await lead.save();
    await lead.populate(leadPopulate);

    res.json({ lead });
  } catch (err) {
    next(err);
  }
};

exports.deleteFollowUp = async (req, res, next) => {
  try {
    const { leadId, followUpId } = req.params;

    if (!mongoose.isValidObjectId(leadId)) {
      return res.status(400).json({ error: 'Invalid leadId' });
    }

    const lead = await populateLeadQuery(Lead.findById(leadId));
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const idx = findLeadFollowUpIndex(lead.followUps, followUpId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Follow-up not found' });
    }

    lead.followUps.splice(idx, 1);

    await lead.save();
    await lead.populate(leadPopulate);

    res.json({ lead });
  } catch (err) {
    next(err);
  }
};

