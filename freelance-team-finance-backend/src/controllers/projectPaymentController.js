const ProjectPayment = require('../models/ProjectPayment');
const Project = require('../models/Project');
const HourlyWork = require('../models/HourlyWork'); // add this line

exports.createPayment = async (req, res, next) => {
  try {
    const {
      project, amount, platformCharge, conversionRate,
      amountInINR, platformWallet, walletStatus, walletReceivedDate,
      bankAccount, bankStatus, bankTransferDate, paymentDate, notes,
      hoursBilled, hourlyWorkEntries
    } = req.body;

    // 1. Validate project exists & belongs to user
    const proj = await Project.findOne({ _id: project, createdBy: req.user.userId });
    if (!proj) return res.status(400).json({ error: 'Project not found or not yours' });

    // ========== FIXED PROJECT PAYMENT ==========
    if (proj.priceType === "fixed") {
      // Always re-calc amountInINR for security
      const calcAmountInINR = (amount - platformCharge) * conversionRate;
      // Create payment
      const payment = await ProjectPayment.create({
        project,
        amount,
        platformCharge,
        conversionRate,
        amountInINR: calcAmountInINR,
        platformWallet, walletStatus, walletReceivedDate,
        bankAccount, bankStatus, bankTransferDate,
        paymentDate, notes
      });
      // Update Project's fixedPrice (received so far)
      proj.fixedPrice = (proj.fixedPrice || 0) + Number(amount);
      await proj.save();

      return res.status(201).json({ payment });
    }

    // ========== HOURLY PROJECT PAYMENT ==========
   if (proj.priceType === "hourly") {
  // Fetch unbilled entries only
  const works = await HourlyWork.find({
    _id: { $in: hourlyWorkEntries },
    project,
    billed: false,
    user: req.user.userId
  });
  if (!works.length) return res.status(400).json({ error: "No valid hourly work entries selected" });

  // Sum hours from selected works
  const totalHours = works.reduce((acc, w) => acc + w.hours, 0);
  const hourlyRate = proj.hourlyRate || 0;
  const amount = totalHours * hourlyRate;
  const calcAmountInINR = (amount - platformCharge) * conversionRate;

  // Create payment
  const payment = await ProjectPayment.create({
    project,
    amount,
    platformCharge,
    conversionRate,
    amountInINR: calcAmountInINR,
    hoursBilled: totalHours,
    hourlyWorkEntries: works.map(w => w._id),
    platformWallet, walletStatus, walletReceivedDate,
    bankAccount, bankStatus, bankTransferDate,
    paymentDate, notes
  });

  // Update HourlyWork entries to billed: true
  await HourlyWork.updateMany(
    { _id: { $in: works.map(w => w._id) } },
    { $set: { billed: true, payment: payment._id } }
  );

  // Update Project's budget (add these hours × rate)
  proj.budget = (proj.budget || 0) + (totalHours * hourlyRate);
  await proj.save();

  return res.status(201).json({ payment });
}

    return res.status(400).json({ error: "Unknown project type" });
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

    // Find the payment and its project type
    const payment = await ProjectPayment.findById(paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const project = await Project.findById(payment.project);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // If hourly, update billed logs
    if (project.priceType === 'hourly' && updates.hourlyWorkEntries) {
      // Mark previously billed entries for this payment as unbilled
      await HourlyWork.updateMany(
        { _id: { $in: payment.hourlyWorkEntries } },
        { $set: { billed: false, payment: null } }
      );
      // Mark selected entries as billed and link payment
      await HourlyWork.updateMany(
        { _id: { $in: updates.hourlyWorkEntries } },
        { $set: { billed: true, payment: paymentId } }
      );
      updates.hoursBilled = updates.hoursBilled || 0;
    }

    // Update payment document
    const updated = await ProjectPayment.findByIdAndUpdate(paymentId, updates, { new: true });

    // After update, sum all project payments for updating received total (fixed or hourly)
    const allPayments = await ProjectPayment.find({ project: project._id });
    let totalReceived = 0;
    if (project.priceType === 'fixed') {
      totalReceived = allPayments.reduce((acc, pay) => acc + (pay.amount || 0), 0);
      project.fixedPrice = totalReceived;
      await project.save();
    } else if (project.priceType === 'hourly') {
      totalReceived = allPayments.reduce((acc, pay) => acc + (pay.amount || 0), 0);
      project.budget = totalReceived;
      await project.save();
    }

    res.json({ payment: updated });
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
