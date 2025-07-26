const mongoose = require('mongoose');
const ProjectPayment = require('../models/ProjectPayment');
const Project = require('../models/Project');
const Account = require('../models/Account');
const HourlyWork = require('../models/HourlyWork');

exports.createPayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      project, amount, platformCharge, conversionRate,
      amountInINR, platformWallet, walletStatus, walletReceivedDate,
      bankAccount, bankStatus, bankTransferDate, paymentDate, notes,
      hoursBilled, hourlyWorkEntries
    } = req.body;

    // 1. Validate project exists & belongs to user
    const proj = await Project.findOne({ _id: project, createdBy: req.user.userId }).session(session);
    if (!proj) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Project not found or not yours' });
    }

    let payment;
    if (proj.priceType === "fixed") {
      const calcAmountInINR = (amount - platformCharge) * conversionRate;

      payment = await ProjectPayment.create([{
        project,
        amount,
        platformCharge,
        conversionRate,
        amountInINR: calcAmountInINR,
        platformWallet, walletStatus, walletReceivedDate,
        bankAccount, bankStatus, bankTransferDate,
        paymentDate, notes
      }], { session });

      // 1. Add to wallet
      if (walletStatus === 'on_hold') {
        await Account.findByIdAndUpdate(platformWallet, { $inc: { balance: calcAmountInINR } }, { session });
      }

      // 2. Update Project's received so far
      proj.fixedPrice = (proj.fixedPrice || 0) + Number(amount);
      await proj.save({ session });

      await session.commitTransaction();
      return res.status(201).json({ payment: payment[0] });
    }

    // ========== HOURLY PROJECT PAYMENT ==========
    if (proj.priceType === "hourly") {
      const works = await HourlyWork.find({
        _id: { $in: hourlyWorkEntries },
        project,
        billed: false,
        user: req.user.userId
      }).session(session);

      if (!works.length) {
        await session.abortTransaction();
        return res.status(400).json({ error: "No valid hourly work entries selected" });
      }

      const totalHours = works.reduce((acc, w) => acc + w.hours, 0);
      const hourlyRate = proj.hourlyRate || 0;
      const calcAmount = totalHours * hourlyRate;
      const calcAmountInINR = (calcAmount - platformCharge) * conversionRate;

      payment = await ProjectPayment.create([{
        project,
        amount: calcAmount,
        platformCharge,
        conversionRate,
        amountInINR: calcAmountInINR,
        hoursBilled: totalHours,
        hourlyWorkEntries: works.map(w => w._id),
        platformWallet, walletStatus, walletReceivedDate,
        bankAccount, bankStatus, bankTransferDate,
        paymentDate, notes
      }], { session });

      // Mark HourlyWork as billed
      await HourlyWork.updateMany(
        { _id: { $in: works.map(w => w._id) } },
        { $set: { billed: true, payment: payment[0]._id } },
        { session }
      );

      // 1. Add to wallet
      if (walletStatus === 'on_hold') {
        await Account.findByIdAndUpdate(platformWallet, { $inc: { balance: calcAmountInINR } }, { session });
      }

      // 2. Update Project's budget (received so far)
      proj.budget = (proj.budget || 0) + (totalHours * hourlyRate);
      await proj.save({ session });

      await session.commitTransaction();
      return res.status(201).json({ payment: payment[0] });
    }

    await session.abortTransaction();
    return res.status(400).json({ error: "Unknown project type" });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};


// --- GET ALL PAYMENTS FOR A PROJECT ---
exports.getPaymentsForProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const payments = await ProjectPayment.find({ project: projectId })
      .populate('platformWallet', 'name type')
      .populate('bankAccount', 'name type')
      .sort({ paymentDate: -1 });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

// --- GET SINGLE PAYMENT ---
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


// --- UPDATE PAYMENT --- (Wallet/Bank logic)
exports.updatePayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { paymentId } = req.params;
    const updates = req.body;

    const payment = await ProjectPayment.findById(paymentId).session(session);
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Payment not found' });
    }

    const project = await Project.findById(payment.project).session(session);
    if (!project) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Project not found' });
    }

    // --- Wallet/Bank Logic ---
    const oldWalletStatus = payment.walletStatus;
    const oldBankStatus = payment.bankStatus;
    const amountInINR = payment.amountInINR;
    const walletId = payment.platformWallet;
    const bankId = payment.bankAccount;

    // --- Only if wallet status is changed ---
    if (updates.walletStatus && updates.walletStatus !== oldWalletStatus) {
      // 1. If moving from "on_hold" => "released"
      if (oldWalletStatus === "on_hold" && updates.walletStatus === "released") {
        // Deduct from wallet
        await Account.findByIdAndUpdate(walletId, { $inc: { balance: -amountInINR } }, { session });
        // Add to bank (if present)
        if (bankId) {
          await Account.findByIdAndUpdate(bankId, { $inc: { balance: amountInINR } }, { session });
        }
        updates.bankStatus = "received"; // enforce this rule
      }
      // 2. If reverting "released" => "on_hold" (very rare, but keep logic)
      if (oldWalletStatus === "released" && updates.walletStatus === "on_hold") {
        // Add back to wallet
        await Account.findByIdAndUpdate(walletId, { $inc: { balance: amountInINR } }, { session });
        // Remove from bank
        if (bankId) {
          await Account.findByIdAndUpdate(bankId, { $inc: { balance: -amountInINR } }, { session });
        }
        updates.bankStatus = "pending"; // enforce this rule
      }
    }

    // --- Hourly work logic (allow update) ---
    if (project.priceType === 'hourly' && updates.hourlyWorkEntries) {
      // Mark previously billed as unbilled
      await HourlyWork.updateMany(
        { _id: { $in: payment.hourlyWorkEntries } },
        { $set: { billed: false, payment: null } },
        { session }
      );
      // Mark new selection as billed
      await HourlyWork.updateMany(
        { _id: { $in: updates.hourlyWorkEntries } },
        { $set: { billed: true, payment: paymentId } },
        { session }
      );
      updates.hoursBilled = updates.hoursBilled || 0;
    }

    // --- Update payment document ---
    const updated = await ProjectPayment.findByIdAndUpdate(paymentId, updates, { new: true, session });

    // --- Update Project totals after update ---
    const allPayments = await ProjectPayment.find({ project: project._id });
    let totalReceived = 0;
    if (project.priceType === 'fixed') {
      totalReceived = allPayments.reduce((acc, pay) => acc + (pay.amount || 0), 0);
      project.fixedPrice = totalReceived;
      await project.save({ session });
    } else if (project.priceType === 'hourly') {
      totalReceived = allPayments.reduce((acc, pay) => acc + (pay.amount || 0), 0);
      project.budget = totalReceived;
      await project.save({ session });
    }

    await session.commitTransaction();
    res.json({ payment: updated });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};


// --- DELETE PAYMENT (optional: revert balances too!) ---
exports.deletePayment = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { paymentId } = req.params;
    const payment = await ProjectPayment.findByIdAndDelete(paymentId).session(session);
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Payment not found' });
    }

    // On delete, revert balances if still in wallet or bank (depends on wallet/bankStatus)
    const { walletStatus, bankStatus, amountInINR, platformWallet, bankAccount } = payment;
    if (walletStatus === "on_hold") {
      await Account.findByIdAndUpdate(platformWallet, { $inc: { balance: -amountInINR } }, { session });
    }
    if (walletStatus === "released" && bankStatus === "received" && bankAccount) {
      await Account.findByIdAndUpdate(bankAccount, { $inc: { balance: -amountInINR } }, { session });
    }

    // Optionally mark HourlyWork as unbilled
    await HourlyWork.updateMany(
      { payment: paymentId },
      { $set: { billed: false, payment: null } },
      { session }
    );

    await session.commitTransaction();
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};
