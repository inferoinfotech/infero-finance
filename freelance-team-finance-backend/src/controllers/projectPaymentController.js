const ProjectPayment = require('../models/ProjectPayment');
const Project = require('../models/Project');

// Create new payment (milestone OR weekly hourly)
exports.createPayment = async (req, res, next) => {
  try {
    const {
      project, platformCharge, conversionRate, 
      platformWallet, walletStatus, walletReceivedDate,
      bankAccount, bankStatus, bankTransferDate,
      hourlyWorkEntries, paymentDate, notes
    } = req.body;

    const proj = await Project.findOne({ _id: project, createdBy: req.user.userId });
    if (!proj) return res.status(400).json({ error: 'Project not found or not yours' });

    if (proj.priceType !== "hourly") {
      return res.status(400).json({ error: "This route is only for hourly payments." });
    }

    // Fetch unbilled hourly work entries for this project
    const works = await HourlyWork.find({
      _id: { $in: hourlyWorkEntries },
      project,
      billed: false,
      user: req.user.userId
    });

    if (works.length === 0) return res.status(400).json({ error: "No valid hourly work entries selected" });

    // Sum hours
    const totalHours = works.reduce((acc, w) => acc + w.hours, 0);
    const hourlyRate = proj.hourlyRate; // always from project
    const amount = totalHours * hourlyRate;
    // User input is now only: platformCharge (absolute), conversionRate
    const receivedAmount = (amount - platformCharge) * conversionRate;

    // Create payment
    const payment = await ProjectPayment.create({
      project,
      amount,
      platformCharge,
      conversionRate,
      amountInINR: receivedAmount,
      hoursBilled: totalHours,
      hourlyWorkEntries: works.map(w => w._id),
      platformWallet, walletStatus, walletReceivedDate,
      bankAccount, bankStatus, bankTransferDate,
      paymentDate, notes
    });

    // Update all the billed logs
    await HourlyWork.updateMany(
      { _id: { $in: works.map(w => w._id) } },
      { $set: { billed: true, payment: payment._id } }
    );

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
