// controllers/leadController.js
const Lead = require('../models/Lead');
const mongoose = require('mongoose');

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
    const lead = await Lead.findById(req.params.leadId)
      .populate('leadBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('platform', 'name');

    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    next(err);
  }
};

exports.updateLead = async (req, res, next) => {
  try {
    const updated = await Lead.findByIdAndUpdate(
      req.params.leadId,
      req.body,
      { new: true }
    )
      .populate('leadBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('platform', 'name');

    if (!updated) return res.status(404).json({ error: 'Lead not found' });
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

    const lead = await Lead.findByIdAndUpdate(
      leadId,
      update,
      { new: true }
    )
      .populate('leadBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('platform', 'name');

    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    res.status(201).json({ lead });
  } catch (err) {
    next(err);
  }
};

