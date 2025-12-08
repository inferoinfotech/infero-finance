const Account = require('../models/Account');
const AccountTxn = require('../models/AccountTxn');
const { logHistory } = require('../utils/historyLogger');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

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
    const accounts = await Account.find({ user: req.user.userId });
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
    
    // Get old value
    const oldAccount = await Account.findOne({ _id: accountId, user: req.user.userId });
    if (!oldAccount) return res.status(404).json({ error: 'Account not found' });
    
    const updated = await Account.findOneAndUpdate(
      { _id: accountId, user: req.user.userId },
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
    const deleted = await Account.findOneAndDelete({ _id: accountId, user: req.user.userId });
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

    // ensure account belongs to user
    const acc = await Account.findOne({ _id: accountId, user: req.user.userId });
    if (!acc) return res.status(404).json({ error: 'Account not found' });

    // Build query
    const query = { account: accountId, user: req.user.userId };
    
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
  const query = { account: accountId, user: userId };
  
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
    const acc = await Account.findOne({ _id: accountId, user: req.user.userId });
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
    const acc = await Account.findOne({ _id: accountId, user: req.user.userId });
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
    const acc = await Account.findOne({ _id: accountId, user: req.user.userId });
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
