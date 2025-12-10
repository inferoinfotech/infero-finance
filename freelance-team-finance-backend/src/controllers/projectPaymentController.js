const mongoose = require('mongoose');
const ProjectPayment = require('../models/ProjectPayment');
const Project = require('../models/Project');
const Account = require('../models/Account');
const HourlyWork = require('../models/HourlyWork');
const { postAccountTxn } = require('../utils/ledger');
const { logHistory } = require('../utils/historyLogger');

async function runWithOptionalTx(workFn) {
  const conn = mongoose.connection;
  let session = null;
  let supportsTx = false;

  try {
    const hello = await conn.db.admin().command({ hello: 1 });
    supportsTx = Boolean(hello.setName);
  } catch {
    supportsTx = false;
  }

  try {
    if (supportsTx) {
      session = await mongoose.startSession();
      session.startTransaction();
      const result = await workFn(session);
      await session.commitTransaction();
      return result;
    } else {
      return await workFn(null);
    }
  } catch (err) {
    if (session) {
      try { await session.abortTransaction(); } catch {}
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

exports.createPayment = async (req, res, next) => {
  runWithOptionalTx(async (session) => {
    const {
      project, amount, platformCharge, conversionRate,
      platformWallet, walletStatus, walletReceivedDate,
      bankAccount, bankStatus, bankTransferDate,
      paymentDate, notes,
      hoursBilled, hourlyWorkEntries
    } = req.body;

    // 1) project check
    const projQuery = Project.findOne({ _id: project, createdBy: req.user.userId });
    const proj = session ? await projQuery.session(session) : await projQuery;
    if (!proj) return res.status(400).json({ error: 'Project not found or not yours' });

    // normalize statuses
    let _walletStatus = walletStatus || 'on_hold';
    let _bankStatus = bankStatus || 'pending';
    if (_walletStatus === 'released') _bankStatus = 'received';

    const pCharge = Number(platformCharge || 0);
    const conv = Number(conversionRate || 0);

    let createdPayment;

    if (proj.priceType === 'fixed') {
      const amt = Number(amount || 0);
      const calcAmountInINR = (amt - pCharge) * conv;

      const doc = {
        project,
        amount: amt,
        platformCharge: pCharge,
        conversionRate: conv,
        amountInINR: calcAmountInINR,
        platformWallet: platformWallet || null,
        walletStatus: _walletStatus,
        walletReceivedDate,
        bankAccount: bankAccount || null,
        bankStatus: _bankStatus,
        bankTransferDate,
        paymentDate,
        notes
      };
      createdPayment = session
        ? (await ProjectPayment.create([doc], { session }))[0]
        : await ProjectPayment.create(doc);

      // LEDGER ENTRIES:
      // case A: wallet on hold → CREDIT wallet
      if (_walletStatus === 'on_hold' && platformWallet) {
        await postAccountTxn({
          userId: req.user.userId,
          accountId: platformWallet,
          type: 'credit',
          amount: calcAmountInINR,
          refType: 'payment',
          refId: createdPayment._id,
          remark: `Payment on-hold (project ${proj._id})`
        }, session);
      }
      // case B: released (or direct bank) → CREDIT bank
      else if (_bankStatus === 'received' && bankAccount) {
        await postAccountTxn({
          userId: req.user.userId,
          accountId: bankAccount,
          type: 'credit',
          amount: calcAmountInINR,
          refType: 'payment',
          refId: createdPayment._id,
          remark: `Payment received in bank (project ${proj._id})`
        }, session);
      }

      // running total for project
      proj.fixedPrice = (proj.fixedPrice || 0) + amt;
      await proj.save(session ? { session } : {});

      // Log payment creation (after transaction commit)
      if (!session) {
        await logHistory({
          userId: req.user.userId,
          action: 'create',
          entityType: 'Payment',
          entityId: createdPayment._id,
          newValue: createdPayment.toObject(),
          description: `Added payment: ${amt} ${proj.currency || 'USD'} for project ${proj.name}`
        });
      }

      return res.status(201).json({ payment: createdPayment });
    }

    // HOURLY
    if (proj.priceType === 'hourly') {
      const logsQuery = HourlyWork.find({
        _id: { $in: (hourlyWorkEntries || []) },
        project,
        billed: false,
        user: req.user.userId
      });
      const works = session ? await logsQuery.session(session) : await logsQuery;
      if (!works.length) return res.status(400).json({ error: 'No valid hourly work entries selected' });

      const totalHours = works.reduce((acc, w) => acc + Number(w.hours || 0), 0);
      const hourlyRate = Number(proj.hourlyRate || 0);
      const calcAmount = totalHours * hourlyRate;
      const calcAmountInINR = (calcAmount - pCharge) * conv;

      const doc = {
        project,
        amount: calcAmount,
        platformCharge: pCharge,
        conversionRate: conv,
        amountInINR: calcAmountInINR,
        hoursBilled: totalHours,
        hourlyWorkEntries: works.map(w => w._id),
        platformWallet: platformWallet || null,
        walletStatus: _walletStatus,
        walletReceivedDate,
        bankAccount: bankAccount || null,
        bankStatus: _bankStatus,
        bankTransferDate,
        paymentDate,
        notes
      };
      createdPayment = session
        ? (await ProjectPayment.create([doc], { session }))[0]
        : await ProjectPayment.create(doc);

      await HourlyWork.updateMany(
        { _id: { $in: works.map(w => w._id) } },
        { $set: { billed: true, payment: createdPayment._id } },
        session ? { session } : {}
      );

      // LEDGER:
      if (_walletStatus === 'on_hold' && platformWallet) {
        await postAccountTxn({
          userId: req.user.userId,
          accountId: platformWallet,
          type: 'credit',
          amount: calcAmountInINR,
          refType: 'payment',
          refId: createdPayment._id,
          remark: `Payment on-hold (project ${proj._id})`
        }, session);
      } else if (_bankStatus === 'received' && bankAccount) {
        await postAccountTxn({
          userId: req.user.userId,
          accountId: bankAccount,
          type: 'credit',
          amount: calcAmountInINR,
          refType: 'payment',
          refId: createdPayment._id,
          remark: `Payment received in bank (project ${proj._id})`
        }, session);
      }

      proj.budget = (proj.budget || 0) + calcAmount;
      await proj.save(session ? { session } : {});

      // Log payment creation (after transaction commit)
      if (!session) {
        await logHistory({
          userId: req.user.userId,
          action: 'create',
          entityType: 'Payment',
          entityId: createdPayment._id,
          newValue: createdPayment.toObject(),
          description: `Added payment: ${calcAmount} ${proj.currency || 'USD'} (${totalHours} hours) for project ${proj.name}`
        });
      }

      return res.status(201).json({ payment: createdPayment });
    }

    return res.status(400).json({ error: 'Unknown project type' });
  }).catch(next);
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
  } catch (err) { next(err); }
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
  } catch (err) { next(err); }
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

async function supportsTransactions() {
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    return !!hello.setName; // replica set name exists => transactions supported
  } catch {
    return false;
  }
}
// --- UPDATE PAYMENT --- (Wallet/Bank logic)
exports.updatePayment = async (req, res, next) => {
  const useTx = await supportsTransactions();
  let session = null;
  try {
    if (useTx) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    const { paymentId } = req.params;
    const updates = req.body;
    const opts = session ? { session } : {};

    const payment = session
      ? await ProjectPayment.findById(paymentId).session(session)
      : await ProjectPayment.findById(paymentId);
    if (!payment) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ error: 'Payment not found' });
    }

    const project = session
      ? await Project.findById(payment.project).session(session)
      : await Project.findById(payment.project);
    if (!project) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ error: 'Project not found' });
    }

    const oldWalletStatus = payment.walletStatus;
    const oldAmountInINR = payment.amountInINR;
    const walletId = updates.platformWallet || payment.platformWallet;
    const bankId = updates.bankAccount || payment.bankAccount;

    // Recalculate amountInINR if amount, platformCharge, or conversionRate changed
    let newAmountInINR = oldAmountInINR;
    const amount = updates.amount !== undefined ? Number(updates.amount) : payment.amount;
    const platformCharge = updates.platformCharge !== undefined ? Number(updates.platformCharge) : payment.platformCharge;
    const conversionRate = updates.conversionRate !== undefined ? Number(updates.conversionRate) : payment.conversionRate;
    
    if (updates.amount !== undefined || updates.platformCharge !== undefined || updates.conversionRate !== undefined) {
      newAmountInINR = (amount - (platformCharge || 0)) * conversionRate;
      updates.amountInINR = newAmountInINR;
    }

    // Handle amount/conversionRate changes without status change
    if (newAmountInINR !== oldAmountInINR && !(updates.walletStatus && updates.walletStatus !== oldWalletStatus)) {
      const difference = newAmountInINR - oldAmountInINR;
      
      if (oldWalletStatus === 'on_hold' && walletId) {
        // Adjust wallet balance
        await postAccountTxn({
          userId: req.user.userId,
          accountId: walletId,
          type: difference > 0 ? 'credit' : 'debit',
          amount: Math.abs(difference),
          refType: 'payment',
          refId: payment._id,
          remark: `Amount adjustment (payment ${payment._id})`
        }, session);
      } else if (oldWalletStatus === 'released' && bankId) {
        // Adjust bank balance
        await postAccountTxn({
          userId: req.user.userId,
          accountId: bankId,
          type: difference > 0 ? 'credit' : 'debit',
          amount: Math.abs(difference),
          refType: 'payment',
          refId: payment._id,
          remark: `Amount adjustment (payment ${payment._id})`
        }, session);
      }
    }

    if (updates.walletStatus && updates.walletStatus !== oldWalletStatus) {
      // RELEASE: wallet -> bank
      if (oldWalletStatus === 'on_hold' && updates.walletStatus === 'released') {
        // If conversionRate changed, first adjust wallet balance to new amount
        if (newAmountInINR !== oldAmountInINR && walletId) {
          const walletAdjustment = newAmountInINR - oldAmountInINR;
          if (walletAdjustment !== 0) {
            await postAccountTxn({
              userId: req.user.userId,
              accountId: walletId,
              type: walletAdjustment > 0 ? 'credit' : 'debit',
              amount: Math.abs(walletAdjustment),
              refType: 'payment',
              refId: payment._id,
              remark: `Rate adjustment before release (payment ${payment._id})`
            }, session);
          }
        }
        
        // Now deduct NEW amount from wallet and add to bank
        if (walletId) {
          await postAccountTxn({
            userId: req.user.userId,
            accountId: walletId,
            type: 'debit',
            amount: newAmountInINR,
            refType: 'transfer',
            refId: payment._id,
            remark: `Release to bank (payment ${payment._id})`
          }, session);
        }
        if (bankId) {
          await postAccountTxn({
            userId: req.user.userId,
            accountId: bankId,
            type: 'credit',
            amount: newAmountInINR,
            refType: 'transfer',
            refId: payment._id,
            remark: `Received from wallet (payment ${payment._id})`
          }, session);
        }
        updates.bankStatus = 'received';
      }

      // REVERT: bank -> wallet
      if (oldWalletStatus === 'released' && updates.walletStatus === 'on_hold') {
        // If conversionRate changed, first adjust bank balance
        if (newAmountInINR !== oldAmountInINR && bankId) {
          const bankAdjustment = newAmountInINR - oldAmountInINR;
          if (bankAdjustment !== 0) {
            await postAccountTxn({
              userId: req.user.userId,
              accountId: bankId,
              type: bankAdjustment > 0 ? 'credit' : 'debit',
              amount: Math.abs(bankAdjustment),
              refType: 'payment',
              refId: payment._id,
              remark: `Rate adjustment before revert (payment ${payment._id})`
            }, session);
          }
        }
        
        // Deduct NEW amount from bank and add to wallet
        if (bankId) {
          await postAccountTxn({
            userId: req.user.userId,
            accountId: bankId,
            type: 'debit',
            amount: newAmountInINR,
            refType: 'transfer',
            refId: payment._id,
            remark: `Revert to wallet (payment ${payment._id})`
          }, session);
        }
        if (walletId) {
          await postAccountTxn({
            userId: req.user.userId,
            accountId: walletId,
            type: 'credit',
            amount: newAmountInINR,
            refType: 'transfer',
            refId: payment._id,
            remark: `Reverted from bank (payment ${payment._id})`
          }, session);
        }
        updates.bankStatus = 'pending';
      }
    }

    // Hourly re-selection
    if (project.priceType === 'hourly' && updates.hourlyWorkEntries) {
      await HourlyWork.updateMany(
        { _id: { $in: payment.hourlyWorkEntries } },
        { $set: { billed: false, payment: null } },
        opts
      );
      await HourlyWork.updateMany(
        { _id: { $in: updates.hourlyWorkEntries } },
        { $set: { billed: true, payment: paymentId } },
        opts
      );
      updates.hoursBilled = updates.hoursBilled || 0;
    }

    const updated = await ProjectPayment.findByIdAndUpdate(paymentId, updates, { new: true, ...opts });

    // recompute project totals
    const all = await ProjectPayment.find({ project: project._id });
    const totalReceived = all.reduce((acc, p) => acc + (p.amount || 0), 0);
    if (project.priceType === 'fixed') project.fixedPrice = totalReceived;
    else project.budget = totalReceived;
    await project.save(opts);

    if (session) { await session.commitTransaction(); session.endSession(); }

    // Log payment update (after transaction commit)
    const oldPayment = payment.toObject();
    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'Payment',
      entityId: paymentId,
      oldValue: oldPayment,
      newValue: updated.toObject(),
      description: `Updated payment: ${updated.amount} ${project.currency || 'USD'} for project ${project.name}`
    });

    res.json({ payment: updated });
  } catch (err) {
    if (session) { try { await session.abortTransaction(); session.endSession(); } catch {} }
    next(err);
  }
};


/* =========================
 * DELETE PAYMENT
 * - Revert balances based on current status
 * ========================= */
exports.deletePayment = async (req, res, next) => {
  runWithOptionalTx(async (session) => {
    const { paymentId } = req.params;
    const paymentQuery = ProjectPayment.findById(paymentId);
    const payment = session ? await paymentQuery.session(session) : await paymentQuery;
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const { walletStatus, bankStatus, amountInINR, platformWallet, bankAccount } = payment;

    // wallet on-hold → reverse (DEBIT wallet)
    if (walletStatus === 'on_hold' && platformWallet) {
      await postAccountTxn({
        userId: req.user.userId,
        accountId: platformWallet,
        type: 'debit',
        amount: amountInINR,
        refType: 'reversal',
        refId: payment._id,
        remark: `Delete payment reversal (wallet on-hold)`
      }, session);
    }
    // released+received → reverse (DEBIT bank)
    if (walletStatus === 'released' && bankStatus === 'received' && bankAccount) {
      await postAccountTxn({
        userId: req.user.userId,
        accountId: bankAccount,
        type: 'debit',
        amount: amountInINR,
        refType: 'reversal',
        refId: payment._id,
        remark: `Delete payment reversal (bank)`
      }, session);
    }

    // Un-bill hourly logs
    await HourlyWork.updateMany(
      { payment: paymentId },
      { $set: { billed: false, payment: null } },
      session ? { session } : {}
    );

    await ProjectPayment.findByIdAndDelete(paymentId).session?.(session) ?? await ProjectPayment.findByIdAndDelete(paymentId);

    // Log payment deletion (after transaction commit)
    if (!session) {
      await logHistory({
        userId: req.user.userId,
        action: 'delete',
        entityType: 'Payment',
        entityId: paymentId,
        oldValue: payment.toObject(),
        description: `Deleted payment: ${payment.amount} for project`
      });
    }

    res.json({ message: 'Payment deleted' });
  }).catch(next);
};