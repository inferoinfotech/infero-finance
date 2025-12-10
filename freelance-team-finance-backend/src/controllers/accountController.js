const Account = require('../models/Account');
const AccountTxn = require('../models/AccountTxn');
const ProjectPayment = require('../models/ProjectPayment');
const Project = require('../models/Project');
const { logHistory } = require('../utils/historyLogger');
const { postAccountTxn } = require('../utils/ledger');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');

// Add new account (bank or wallet)
exports.createAccount = async (req, res, next) => {
  try {
    const { type, name, details } = req.body;
    const account = await Account.create({
      user: req.user.userId,
      type,
      name,
      details,
    });

    // Log account creation
    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'Account',
      entityId: account._id,
      newValue: account.toObject(),
      description: `Created ${type} account: ${name}`
    });

    res.status(201).json({ account });
  } catch (err) {
    next(err);
  }
};

// Get all accounts for logged-in user
exports.getAccounts = async (req, res, next) => {
  try {
    // Admin and Owner see all accounts, others see only their own
    const query = (req.user.role === 'admin' || req.user.role === 'owner')
      ? {}
      : { user: req.user.userId };
    
    const accounts = await Account.find(query);
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
};

// Update account (e.g. change name/details)
exports.updateAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { name, details } = req.body;
    
    // Admin and Owner can update any account, others only their own
    const query = (req.user.role === 'admin' || req.user.role === 'owner')
      ? { _id: accountId }
      : { _id: accountId, user: req.user.userId };
    
    // Get old value
    const oldAccount = await Account.findOne(query);
    if (!oldAccount) return res.status(404).json({ error: 'Account not found' });
    
    const updated = await Account.findOneAndUpdate(
      query,
      { name, details },
      { new: true }
    );

    // Log account update
    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'Account',
      entityId: accountId,
      oldValue: oldAccount.toObject(),
      newValue: updated.toObject(),
      description: `Updated account: ${updated.name}`
    });

    res.json({ account: updated });
  } catch (err) {
    next(err);
  }
};

// Delete account
exports.deleteAccount = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    // Admin and Owner can delete any account, others only their own
    const query = (req.user.role === 'admin' || req.user.role === 'owner')
      ? { _id: accountId }
      : { _id: accountId, user: req.user.userId };
    
    const deleted = await Account.findOneAndDelete(query);
    if (!deleted) return res.status(404).json({ error: 'Account not found' });

    // Log account deletion
    await logHistory({
      userId: req.user.userId,
      action: 'delete',
      entityType: 'Account',
      entityId: accountId,
      oldValue: deleted.toObject(),
      description: `Deleted account: ${deleted.name}`
    });

    res.json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
};


exports.getAccountStatement = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 500); // Increased limit for detail page
    const skip = Math.max(Number(req.query.skip || 0), 0);
    
    // Filter parameters
    const typeFilter = req.query.type; // 'credit' or 'debit'
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const searchTerm = req.query.search; // Search in remark field

    // Admin and Owner can access any account, others only their own
    const accountQuery = (req.user.role === 'admin' || req.user.role === 'owner')
      ? { _id: accountId }
      : { _id: accountId, user: req.user.userId };
    
    const acc = await Account.findOne(accountQuery);
    if (!acc) return res.status(404).json({ error: 'Account not found' });

    // Build query - Admin/Owner can see all transactions for this account
    const query = { account: accountId };
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
      query.user = req.user.userId;
    }
    
    if (typeFilter && (typeFilter === 'credit' || typeFilter === 'debit')) {
      query.type = typeFilter;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) {
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endOfDay;
      }
    }
    
    if (searchTerm) {
      query.remark = { $regex: searchTerm, $options: 'i' };
    }

    const txns = await AccountTxn.find(query)
      .sort({ createdAt: -1 }) // newest first for detail page
      .skip(skip)
      .limit(limit);

    const total = await AccountTxn.countDocuments(query);

    res.json({ 
      account: { _id: acc._id, name: acc.name, type: acc.type, balance: acc.balance }, 
      txns,
      total,
      limit,
      skip
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to build query with filters
const buildStatementQuery = (accountId, userId, req) => {
  const query = { account: accountId };
  // Admin and Owner can see all transactions, others only their own
  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    query.user = userId;
  }
  
  const typeFilter = req.query.type;
  const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
  const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
  const searchTerm = req.query.search;

  if (typeFilter && (typeFilter === 'credit' || typeFilter === 'debit')) {
    query.type = typeFilter;
  }
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endOfDay;
    }
  }
  
  if (searchTerm) {
    query.remark = { $regex: searchTerm, $options: 'i' };
  }

  return query;
};

// CSV Export
exports.exportStatementCSV = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    // Admin and Owner can export any account, others only their own
    const accountQuery = (req.user.role === 'admin' || req.user.role === 'owner')
      ? { _id: accountId }
      : { _id: accountId, user: req.user.userId };
    
    const acc = await Account.findOne(accountQuery);
    if (!acc) return res.status(404).json({ error: 'Account not found' });

    const query = buildStatementQuery(accountId, req.user.userId, req);
    const txns = await AccountTxn.find(query).sort({ createdAt: -1 }).lean();

    const data = txns.map(txn => ({
      'Date & Time': new Date(txn.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      'Type': txn.type.toUpperCase(),
      'Amount': txn.amount,
      'Balance After': txn.balanceAfter,
      'Reference Type': txn.refType || '',
      'Remark': txn.remark || ''
    }));

    const fields = ['Date & Time', 'Type', 'Amount', 'Balance After', 'Reference Type', 'Remark'];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    const fileName = `account-statement-${acc.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// Excel Export
exports.exportStatementExcel = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    // Admin and Owner can export any account, others only their own
    const accountQuery = (req.user.role === 'admin' || req.user.role === 'owner')
      ? { _id: accountId }
      : { _id: accountId, user: req.user.userId };
    
    const acc = await Account.findOne(accountQuery);
    if (!acc) return res.status(404).json({ error: 'Account not found' });

    const query = buildStatementQuery(accountId, req.user.userId, req);
    const txns = await AccountTxn.find(query).sort({ createdAt: -1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Account Statement');

    // Add account info at top
    worksheet.addRow(['Account Statement']);
    worksheet.addRow(['Account Name:', acc.name]);
    worksheet.addRow(['Account Type:', acc.type]);
    worksheet.addRow(['Current Balance:', acc.balance || 0]);
    worksheet.addRow(['Generated On:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })]);
    worksheet.addRow([]); // Empty row

    // Table headers
    worksheet.addRow(['Date & Time', 'Type', 'Amount', 'Balance After', 'Reference Type', 'Remark']);
    
    // Style header row
    const headerRow = worksheet.getRow(worksheet.rowCount);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add transaction rows
    txns.forEach(txn => {
      worksheet.addRow([
        new Date(txn.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        txn.type.toUpperCase(),
        txn.amount,
        txn.balanceAfter,
        txn.refType || '',
        txn.remark || ''
      ]);
    });

    // Set column widths
    worksheet.columns = [
      { width: 20 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 18 },
      { width: 40 }
    ];

    const fileName = `account-statement-${acc.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(fileName);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

// PDF Export
exports.exportStatementPDF = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    // Admin and Owner can export any account, others only their own
    const accountQuery = (req.user.role === 'admin' || req.user.role === 'owner')
      ? { _id: accountId }
      : { _id: accountId, user: req.user.userId };
    
    const acc = await Account.findOne(accountQuery);
    if (!acc) return res.status(404).json({ error: 'Account not found' });

    const query = buildStatementQuery(accountId, req.user.userId, req);
    const txns = await AccountTxn.find(query).sort({ createdAt: -1 }).lean();

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      const fileName = `account-statement-${acc.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfData);
    });

    // Header
    doc.fontSize(20).text('Account Statement', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Account: ${acc.name}`, { align: 'left' });
    doc.text(`Type: ${acc.type.toUpperCase()}`, { align: 'left' });
    doc.text(`Current Balance: ₹${(acc.balance || 0).toLocaleString('en-IN')}`, { align: 'left' });
    doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, { align: 'left' });
    doc.moveDown(2);

    if (txns.length === 0) {
      doc.fontSize(14).text('No transactions found', { align: 'center' });
      doc.end();
      return;
    }

    // Table headers
    const startY = doc.y;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Date & Time', 50, doc.y, { width: 80 });
    doc.text('Type', 130, doc.y, { width: 40 });
    doc.text('Amount', 170, doc.y, { width: 60, align: 'right' });
    doc.text('Balance', 230, doc.y, { width: 70, align: 'right' });
    doc.text('Reference', 300, doc.y, { width: 60 });
    doc.text('Remark', 360, doc.y, { width: 200 });
    
    doc.moveTo(50, doc.y + 15).lineTo(560, doc.y + 15).stroke();
    doc.moveDown(1);

    // Table rows
    doc.font('Helvetica');
    let yPos = doc.y;
    txns.forEach((txn, index) => {
      if (yPos > 750) { // New page if needed
        doc.addPage();
        yPos = 50;
      }

      const dateStr = new Date(txn.createdAt).toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      doc.fontSize(9);
      doc.text(dateStr, 50, yPos, { width: 80 });
      doc.text(txn.type.toUpperCase(), 130, yPos, { width: 40 });
      doc.text(`₹${txn.amount.toLocaleString('en-IN')}`, 170, yPos, { width: 60, align: 'right' });
      doc.text(`₹${txn.balanceAfter.toLocaleString('en-IN')}`, 230, yPos, { width: 70, align: 'right' });
      doc.text(txn.refType || '—', 300, yPos, { width: 60 });
      doc.text((txn.remark || '—').substring(0, 30), 360, yPos, { width: 200 });
      
      yPos += 20;
      doc.y = yPos;
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};

// Helper function to check if MongoDB supports transactions
async function supportsTransactions() {
  try {
    const conn = mongoose.connection;
    const hello = await conn.db.admin().command({ hello: 1 });
    return Boolean(hello.setName);
  } catch {
    return false;
  }
}

// Transfer money from wallet to bank
exports.transferMoney = async (req, res, next) => {
  const useTx = await supportsTransactions();
  let session = null;
  
  try {
    if (useTx) {
      session = await mongoose.startSession();
      session.startTransaction();
    }
    const { walletId, bankId, amount, conversionRate } = req.body;
    
    // Validate inputs
    if (!walletId || !bankId || !amount || !conversionRate) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ error: 'Missing required fields: walletId, bankId, amount, conversionRate' });
    }

    const walletAmount = Number(amount);
    const rate = Number(conversionRate);
    const amountInINR = walletAmount * rate;
    const opts = session ? { session } : {};

    // Verify accounts exist and belong to user
    const walletQuery = Account.findOne({ _id: walletId, user: req.user.userId, type: 'wallet' });
    const bankQuery = Account.findOne({ _id: bankId, user: req.user.userId, type: 'bank' });
    const wallet = session ? await walletQuery.session(session) : await walletQuery;
    const bank = session ? await bankQuery.session(session) : await bankQuery;
    
    if (!wallet) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ error: 'Wallet account not found' });
    }
    if (!bank) {
      if (session) await session.abortTransaction();
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Find all on_hold payments for this wallet, sorted by createdAt (oldest first)
    // Include both original and split payments that are still on_hold
    const onHoldPaymentsQuery = ProjectPayment.find({
      platformWallet: walletId,
      walletStatus: 'on_hold'
      // Note: We include split payments too, as they can still be on_hold after a partial transfer
    }).sort({ createdAt: 1 }); // Oldest first
    
    const onHoldPayments = session 
      ? await onHoldPaymentsQuery.session(session)
      : await onHoldPaymentsQuery;

    // Calculate total available amount (in original currency)
    let totalAvailable = 0;
    const paymentDetails = [];
    for (const payment of onHoldPayments) {
      const netAmount = payment.amount - (payment.platformCharge || 0);
      totalAvailable += netAmount;
      paymentDetails.push({
        id: payment._id,
        amount: payment.amount,
        platformCharge: payment.platformCharge || 0,
        netAmount: netAmount,
        isSplit: payment.isSplitPayment || false
      });
    }

    if (totalAvailable < walletAmount) {
      if (session) await session.abortTransaction();
      return res.status(400).json({ 
        error: `Insufficient on_hold balance. Available: ${totalAvailable.toFixed(2)}, Requested: ${walletAmount.toFixed(2)}`,
        details: {
          foundPayments: onHoldPayments.length,
          paymentDetails: paymentDetails,
          totalAvailable: totalAvailable.toFixed(2)
        }
      });
    }

    // Process payments in order until we reach the transfer amount
    let remainingToTransfer = walletAmount;
    const processedPayments = [];
    let splitPayment = null;

    for (const payment of onHoldPayments) {
      if (remainingToTransfer <= 0) break;

      const netAmount = payment.amount - (payment.platformCharge || 0);
      const project = session 
        ? await Project.findById(payment.project).session(session)
        : await Project.findById(payment.project);
      
      if (!project) continue;

      if (netAmount <= remainingToTransfer) {
        // Release full payment
        const oldAmountInINR = payment.amountInINR;
        const newAmountInINR = netAmount * rate;
        
        // Adjust wallet balance if rate changed
        if (newAmountInINR !== oldAmountInINR && walletId) {
          const adjustment = newAmountInINR - oldAmountInINR;
          if (adjustment !== 0) {
            await postAccountTxn({
              userId: req.user.userId,
              accountId: walletId,
              type: adjustment > 0 ? 'credit' : 'debit',
              amount: Math.abs(adjustment),
              refType: 'transfer',
              refId: payment._id,
              remark: `Rate adjustment before transfer (payment ${payment._id})`
            }, session);
          }
        }

        // Update payment: release and set bank account
        payment.walletStatus = 'released';
        payment.bankStatus = 'received';
        payment.bankAccount = bankId;
        payment.conversionRate = rate; // Update to new rate
        payment.amountInINR = newAmountInINR;
        payment.bankTransferDate = new Date();
        await payment.save(opts);

        // Deduct from wallet and add to bank
        await postAccountTxn({
          userId: req.user.userId,
          accountId: walletId,
          type: 'debit',
          amount: newAmountInINR,
          refType: 'transfer',
          refId: payment._id,
          remark: `Transfer to bank (payment ${payment._id})`
        }, session);

        await postAccountTxn({
          userId: req.user.userId,
          accountId: bankId,
          type: 'credit',
          amount: newAmountInINR,
          refType: 'transfer',
          refId: payment._id,
          remark: `Received from wallet (payment ${payment._id})`
        }, session);

        processedPayments.push(payment._id);
        remainingToTransfer -= netAmount;
      } else {
        // Need to split this payment
        const releaseAmount = remainingToTransfer;
        const keepAmount = netAmount - releaseAmount;
        const platformCharge = payment.platformCharge || 0;
        
        // Calculate proportional platform charge
        const releasePlatformCharge = (platformCharge * releaseAmount) / netAmount;
        const keepPlatformCharge = platformCharge - releasePlatformCharge;

        // Update original payment to keep the remaining amount
        const oldAmountInINR = payment.amountInINR;
        const keepAmountInINR = keepAmount * payment.conversionRate; // Keep original rate for on_hold portion
        payment.amount = keepAmount + keepPlatformCharge;
        payment.platformCharge = keepPlatformCharge;
        payment.amountInINR = keepAmountInINR;
        await payment.save(opts);

        // When splitting, we need to:
        // 1. Reverse the original credit (debit oldAmountInINR)
        // 2. Credit back the kept portion (credit keepAmountInINR)
        // 3. For released portion: handle rate adjustment and debit it
        
        // Step 1: Reverse the original credit
        if (walletId) {
          await postAccountTxn({
            userId: req.user.userId,
            accountId: walletId,
            type: 'debit',
            amount: oldAmountInINR,
            refType: 'transfer',
            refId: payment._id,
            remark: `Reverse original payment credit for split (payment ${payment._id})`
          }, session);
        }

        // Step 2: Credit back the kept portion
        if (walletId) {
          await postAccountTxn({
            userId: req.user.userId,
            accountId: walletId,
            type: 'credit',
            amount: keepAmountInINR,
            refType: 'transfer',
            refId: payment._id,
            remark: `Credit kept portion after split (payment ${payment._id})`
          }, session);
        }

        // Create new payment entry for released portion
        const oldReleasedAmountInINR = releaseAmount * payment.conversionRate; // At original rate
        const releasedAmountInINR = releaseAmount * rate; // At new rate
        const splitPaymentDoc = {
          project: payment.project,
          amount: releaseAmount + releasePlatformCharge,
          platformCharge: releasePlatformCharge,
          conversionRate: rate, // New rate for released portion
          amountInINR: releasedAmountInINR,
          platformWallet: walletId,
          walletStatus: 'released',
          walletReceivedDate: payment.walletReceivedDate,
          bankAccount: bankId,
          bankStatus: 'received',
          bankTransferDate: new Date(),
          paymentDate: payment.paymentDate,
          notes: payment.notes ? `${payment.notes} (Split from payment ${payment._id})` : `Split from payment ${payment._id}`,
          isSplitPayment: true,
          parentPaymentId: payment._id,
          hoursBilled: payment.hoursBilled ? (payment.hoursBilled * releaseAmount) / netAmount : undefined,
          hourlyWorkEntries: [] // Don't copy hourly work entries for split
        };

        splitPayment = session 
          ? (await ProjectPayment.create([splitPaymentDoc], { session }))[0]
          : await ProjectPayment.create(splitPaymentDoc);

        // The wallet was already credited with oldReleasedAmountInINR (as part of original payment)
        // Now we need to:
        // 1. Adjust for rate change (if rate changed)
        // 2. Debit the released amount from wallet (at new rate)
        // 3. Credit to bank (at new rate)
        
        // First, adjust wallet if rate changed
        if (releasedAmountInINR !== oldReleasedAmountInINR && walletId) {
          const rateAdjustment = releasedAmountInINR - oldReleasedAmountInINR;
          if (rateAdjustment !== 0) {
            await postAccountTxn({
              userId: req.user.userId,
              accountId: walletId,
              type: rateAdjustment > 0 ? 'credit' : 'debit',
              amount: Math.abs(rateAdjustment),
              refType: 'transfer',
              refId: splitPayment._id,
              remark: `Rate adjustment for split payment (payment ${splitPayment._id})`
            }, session);
          }
        }

        // Step 3c: For released portion - we need to credit it back at old rate first
        // (since we reversed the full original credit), then debit at new rate
        if (walletId) {
          // Credit released portion at old rate (to restore what was originally credited)
          await postAccountTxn({
            userId: req.user.userId,
            accountId: walletId,
            type: 'credit',
            amount: oldReleasedAmountInINR,
            refType: 'transfer',
            refId: splitPayment._id,
            remark: `Credit released portion at old rate (payment ${splitPayment._id})`
          }, session);
        }
        
        // Now debit the released amount from wallet (at new rate) and credit to bank
        await postAccountTxn({
          userId: req.user.userId,
          accountId: walletId,
          type: 'debit',
          amount: releasedAmountInINR,
          refType: 'transfer',
          refId: splitPayment._id,
          remark: `Transfer to bank (split payment ${splitPayment._id})`
        }, session);

        await postAccountTxn({
          userId: req.user.userId,
          accountId: bankId,
          type: 'credit',
          amount: releasedAmountInINR,
          refType: 'transfer',
          refId: splitPayment._id,
          remark: `Received from wallet (split payment ${splitPayment._id})`
        }, session);

        processedPayments.push(splitPayment._id);
        remainingToTransfer = 0;
        break;
      }
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    // Log transfer
    await logHistory({
      userId: req.user.userId,
      action: 'transfer',
      entityType: 'Account',
      entityId: walletId,
      newValue: {
        walletId,
        bankId,
        amount: walletAmount,
        conversionRate: rate,
        amountInINR,
        processedPayments: processedPayments.length,
        splitPayment: splitPayment ? splitPayment._id : null
      },
      description: `Transferred ${walletAmount} (${amountInINR} INR) from ${wallet.name} to ${bank.name}`
    });

    res.json({
      success: true,
      message: `Successfully transferred ${walletAmount} (${amountInINR} INR)`,
      transfer: {
        walletId,
        bankId,
        amount: walletAmount,
        conversionRate: rate,
        amountInINR,
        processedPayments: processedPayments.length,
        splitPayment: splitPayment ? splitPayment._id : null
      }
    });
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch {}
    }
    next(err);
  }
};
