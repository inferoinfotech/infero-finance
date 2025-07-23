const ProjectPayment = require('../models/ProjectPayment');
const Project = require('../models/Project');

// Create new payment (milestone OR weekly hourly)
exports.createPayment = async (req, res, next) => {
  try {
    const {
      project, amount, currency, amountInINR,
      platformWallet, walletStatus, walletReceivedDate,
      bankAccount, bankStatus, bankTransferDate,
      hoursBilled, hourlyWorkEntries,
      paymentDate, notes
    } = req.body;

    // Validate project exists and belongs to user
    const proj = await Project.findOne({ _id: project, createdBy: req.user.userId });
    if (!proj) return res.status(400).json({ error: 'Project not found or not yours' });

    // For hourly, ensure hours/entries provided if needed
    if (proj.priceType === 'hourly' && (!hoursBilled || !hourlyWorkEntries || hourlyWorkEntries.length === 0)) {
      return res.status(400).json({ error: 'Hourly payments must include billed hours and hourly work entries' });
    }

    const payment = await ProjectPayment.create({
      project, amount, currency, amountInINR,
      platformWallet, walletStatus, walletReceivedDate,
      bankAccount, bankStatus, bankTransferDate,
      hoursBilled, hourlyWorkEntries,
      paymentDate, notes
    });

    res.status(201).json({ payment });
  } catch (err) {
    next(err);
  }
};

// Get all payments for a project
exports.getPaymentsForProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    // Only payments for the user's project
    const payments = await ProjectPayment.find({ project: projectId })
      .populate('platformWallet', 'name type')
      .populate('bankAccount', 'name type')
      .sort({ paymentDate: -1 });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

// Get single payment by ID
exports.getPaymentById = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const payment = await ProjectPayment.findById(paymentId)
      .populate('platformWallet', 'name type')
      .populate('bankAccount', 'name type');
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json({ payment });
  } catch (err) {
    next(err);
  }
};

// Update payment (e.g., mark wallet/bank status, add bank account after transfer)
exports.updatePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const updates = req.body;
    const payment = await ProjectPayment.findByIdAndUpdate(paymentId, updates, { new: true });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json({ payment });
  } catch (err) {
    next(err);
  }
};

// Delete payment (if needed)
exports.deletePayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const deleted = await ProjectPayment.findByIdAndDelete(paymentId);
    if (!deleted) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    next(err);
  }
};
