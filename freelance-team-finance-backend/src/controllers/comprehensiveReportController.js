const Expense = require('../models/Expense');
const ProjectPayment = require('../models/ProjectPayment');
const Project = require('../models/Project');
const Account = require('../models/Account');
const AccountTxn = require('../models/AccountTxn');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');

const toObjectId = (id) => {
  try { return new mongoose.Types.ObjectId(id) } catch { return null }
}

// Build date filter from query params
function buildDateFilter(req) {
  const { startDate, endDate } = req.query;
  const filter = {};
  
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      const fromDate = new Date(startDate);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        filter.date.$gte = fromDate;
      }
    }
    if (endDate) {
      const toDate = new Date(endDate);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }
  }
  
  return filter;
}

// ========== INCOME/PAYMENT REPORTS ==========

async function getPaymentData(req) {
  const match = {};
  const { startDate, endDate } = req.query;
  
  // Date filter
  if (startDate || endDate) {
    match.paymentDate = {};
    if (startDate) {
      const fromDate = new Date(startDate);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        match.paymentDate.$gte = fromDate;
      }
    }
    if (endDate) {
      const toDate = new Date(endDate);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        match.paymentDate.$lte = toDate;
      }
    }
  }
  
  // User scope
  if (req.query.scope === 'me' && req.user?.userId) {
    const projects = await Project.find({ createdBy: req.user.userId }).select('_id').lean();
    match.project = { $in: projects.map(p => p._id) };
  }
  
  const payments = await ProjectPayment.find(match)
    .populate('project', 'name clientName platform currency')
    .populate('platformWallet', 'name')
    .populate('bankAccount', 'name')
    .populate('platform', 'name')
    .sort({ paymentDate: -1 })
    .lean();
    
  return payments;
}

exports.exportIncomeCSV = async (req, res, next) => {
  try {
    const payments = await getPaymentData(req);
    
    const data = payments.map(p => ({
      'Payment Date': p.paymentDate?.toISOString().split('T')[0] || '',
      'Project': p.project?.name || '',
      'Client': p.project?.clientName || '',
      'Platform': p.platform?.name || '',
      'Amount': p.amount,
      'Platform Charge': p.platformCharge || 0,
      'Net Amount': (p.amount - (p.platformCharge || 0)).toFixed(2),
      'Currency': p.project?.currency || '',
      'Conversion Rate': p.conversionRate,
      'Amount in INR': p.amountInINR,
      'Wallet Status': p.walletStatus,
      'Bank Status': p.bankStatus,
      'Wallet Account': p.platformWallet?.name || '',
      'Bank Account': p.bankAccount?.name || '',
      'Notes': p.notes || ''
    }));
    
    const parser = new Parser();
    const csv = parser.parse(data);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`income-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

exports.exportIncomeExcel = async (req, res, next) => {
  try {
    const payments = await getPaymentData(req);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Income Report');
    
    worksheet.columns = [
      { header: 'Payment Date', key: 'paymentDate', width: 15 },
      { header: 'Project', key: 'project', width: 25 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Platform', key: 'platform', width: 15 },
      { header: 'Amount', key: 'amount', width: 12, style: { numFmt: '#,##0.00' } },
      { header: 'Platform Charge', key: 'platformCharge', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Net Amount', key: 'netAmount', width: 12, style: { numFmt: '#,##0.00' } },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Conversion Rate', key: 'conversionRate', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Amount in INR', key: 'amountInINR', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Wallet Status', key: 'walletStatus', width: 12 },
      { header: 'Bank Status', key: 'bankStatus', width: 12 },
      { header: 'Wallet Account', key: 'walletAccount', width: 20 },
      { header: 'Bank Account', key: 'bankAccount', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];
    
    // Header style
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    payments.forEach(p => {
      worksheet.addRow({
        paymentDate: p.paymentDate?.toISOString().split('T')[0] || '',
        project: p.project?.name || '',
        client: p.project?.clientName || '',
        platform: p.platform?.name || '',
        amount: p.amount,
        platformCharge: p.platformCharge || 0,
        netAmount: p.amount - (p.platformCharge || 0),
        currency: p.project?.currency || '',
        conversionRate: p.conversionRate,
        amountInINR: p.amountInINR,
        walletStatus: p.walletStatus,
        bankStatus: p.bankStatus,
        walletAccount: p.platformWallet?.name || '',
        bankAccount: p.bankAccount?.name || '',
        notes: p.notes || ''
      });
    });
    
    // Add summary row
    const totalRow = worksheet.addRow({});
    worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    worksheet.getCell(`A${totalRow.number}`).value = 'TOTAL';
    worksheet.getCell(`A${totalRow.number}`).font = { bold: true };
    worksheet.getCell(`J${totalRow.number}`).value = {
      formula: `SUM(J2:J${totalRow.number - 1})`,
      result: payments.reduce((sum, p) => sum + (p.amountInINR || 0), 0)
    };
    worksheet.getCell(`J${totalRow.number}`).font = { bold: true };
    worksheet.getCell(`J${totalRow.number}`).numFmt = '#,##0.00';
    
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`income-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.exportIncomePDF = async (req, res, next) => {
  try {
    const payments = await getPaymentData(req);
    const totalIncome = payments.reduce((sum, p) => sum + (p.amountInINR || 0), 0);
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.attachment(`income-report-${new Date().toISOString().split('T')[0]}.pdf`);
      res.send(pdfData);
    });
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Income Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    if (req.query.startDate || req.query.endDate) {
      doc.text(`Period: ${req.query.startDate || 'All'} to ${req.query.endDate || 'All'}`, { align: 'center' });
    }
    doc.moveDown();
    doc.fillColor('black');
    
    // Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Total Payments: ${payments.length}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.text(`Total Income (INR): ₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 50, doc.y);
    doc.moveDown();
    
    // Table
    const tableTop = doc.y;
    const itemHeight = 20;
    const pageHeight = 750;
    let yPos = tableTop;
    
    // Table header
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Date', 50, yPos);
    doc.text('Project', 100, yPos, { width: 80 });
    doc.text('Client', 180, yPos, { width: 60 });
    doc.text('Amount', 240, yPos, { width: 60, align: 'right' });
    doc.text('INR', 300, yPos, { width: 70, align: 'right' });
    doc.text('Status', 370, yPos, { width: 50 });
    yPos += itemHeight;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    
    // Table rows
    doc.fontSize(8).font('Helvetica');
    payments.forEach((p, index) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 50;
      }
      
      const date = p.paymentDate?.toISOString().split('T')[0] || '';
      const project = (p.project?.name || '').substring(0, 20);
      const client = (p.project?.clientName || '').substring(0, 15);
      const amount = `${p.amount} ${p.project?.currency || ''}`;
      const inr = `₹${(p.amountInINR || 0).toLocaleString('en-IN')}`;
      const status = `${p.walletStatus}/${p.bankStatus}`;
      
      doc.text(date, 50, yPos);
      doc.text(project, 100, yPos, { width: 80 });
      doc.text(client, 180, yPos, { width: 60 });
      doc.text(amount, 240, yPos, { width: 60, align: 'right' });
      doc.text(inr, 300, yPos, { width: 70, align: 'right' });
      doc.text(status, 370, yPos, { width: 50 });
      yPos += itemHeight;
    });
    
    // Footer
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 10;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Total Income:', 240, yPos);
    doc.text(`₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 300, yPos, { width: 70, align: 'right' });
    
    doc.end();
  } catch (err) {
    next(err);
  }
};

// ========== EXPENSE REPORTS ==========

async function getExpenseData(req) {
  const match = buildDateFilter(req);
  
  // User scope
  if (req.query.scope === 'me' && req.user?.userId) {
    match.createdBy = toObjectId(req.user.userId);
  }
  
  const expenses = await Expense.find(match)
    .populate('withdrawAccount', 'name')
    .populate('category', 'name')
    .populate('createdBy', 'name')
    .sort({ date: -1 })
    .lean();
    
  return expenses;
}

exports.exportExpenseCSV = async (req, res, next) => {
  try {
    const expenses = await getExpenseData(req);
    
    const data = expenses.map(e => ({
      'Date': e.date?.toISOString().split('T')[0] || '',
      'Type': e.type,
      'Name': e.name,
      'Category': e.category?.name || '',
      'Amount (INR)': e.amount,
      'Account': e.withdrawAccount?.name || '',
      'Created By': e.createdBy?.name || '',
      'Reminder': e.reminder || '',
      'Reminder Date': e.reminderDate?.toISOString().split('T')[0] || '',
      'Notes': e.notes || ''
    }));
    
    const parser = new Parser();
    const csv = parser.parse(data);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`expense-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

exports.exportExpenseExcel = async (req, res, next) => {
  try {
    const expenses = await getExpenseData(req);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expense Report');
    
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Amount (INR)', key: 'amount', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Account', key: 'account', width: 20 },
      { header: 'Created By', key: 'createdBy', width: 18 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC3545' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    expenses.forEach(e => {
      worksheet.addRow({
        date: e.date?.toISOString().split('T')[0] || '',
        type: e.type,
        name: e.name,
        category: e.category?.name || '',
        amount: e.amount,
        account: e.withdrawAccount?.name || '',
        createdBy: e.createdBy?.name || '',
        notes: e.notes || ''
      });
    });
    
    const totalRow = worksheet.addRow({});
    worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    worksheet.getCell(`A${totalRow.number}`).value = 'TOTAL';
    worksheet.getCell(`A${totalRow.number}`).font = { bold: true };
    worksheet.getCell(`E${totalRow.number}`).value = {
      formula: `SUM(E2:E${totalRow.number - 1})`,
      result: expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    };
    worksheet.getCell(`E${totalRow.number}`).font = { bold: true };
    worksheet.getCell(`E${totalRow.number}`).numFmt = '#,##0.00';
    
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`expense-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.exportExpensePDF = async (req, res, next) => {
  try {
    const expenses = await getExpenseData(req);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.attachment(`expense-report-${new Date().toISOString().split('T')[0]}.pdf`);
      res.send(pdfData);
    });
    
    doc.fontSize(24).font('Helvetica-Bold').text('Expense Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    if (req.query.startDate || req.query.endDate) {
      doc.text(`Period: ${req.query.startDate || 'All'} to ${req.query.endDate || 'All'}`, { align: 'center' });
    }
    doc.moveDown();
    doc.fillColor('black');
    
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Total Expenses: ${expenses.length}`, 50, doc.y);
    doc.moveDown(0.3);
    doc.text(`Total Amount: ₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 50, doc.y);
    doc.moveDown();
    
    const tableTop = doc.y;
    const itemHeight = 20;
    const pageHeight = 750;
    let yPos = tableTop;
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Date', 50, yPos);
    doc.text('Type', 100, yPos);
    doc.text('Name', 150, yPos, { width: 100 });
    doc.text('Category', 250, yPos, { width: 80 });
    doc.text('Amount', 330, yPos, { width: 80, align: 'right' });
    doc.text('Account', 410, yPos, { width: 90 });
    yPos += itemHeight;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    
    doc.fontSize(8).font('Helvetica');
    expenses.forEach((e) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 50;
      }
      
      doc.text(e.date?.toISOString().split('T')[0] || '', 50, yPos);
      doc.text(e.type || '', 100, yPos);
      doc.text((e.name || '').substring(0, 25), 150, yPos, { width: 100 });
      doc.text((e.category?.name || '').substring(0, 20), 250, yPos, { width: 80 });
      doc.text(`₹${(e.amount || 0).toLocaleString('en-IN')}`, 330, yPos, { width: 80, align: 'right' });
      doc.text((e.withdrawAccount?.name || '').substring(0, 20), 410, yPos, { width: 90 });
      yPos += itemHeight;
    });
    
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 10;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Total:', 330, yPos);
    doc.text(`₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 330, yPos, { width: 80, align: 'right' });
    
    doc.end();
  } catch (err) {
    next(err);
  }
};

// ========== PROJECT REPORTS ==========

async function getProjectData(req) {
  const match = {};
  
  // User scope
  if (req.query.scope === 'me' && req.user?.userId) {
    match.createdBy = toObjectId(req.user.userId);
  }
  
  // Status filter
  if (req.query.status) {
    match.status = req.query.status;
  }
  
  const projects = await Project.find(match)
    .populate('platform', 'name')
    .sort({ createdAt: -1 })
    .lean();
    
  // Get payment totals for each project
  const projectIds = projects.map(p => p._id);
  const payments = await ProjectPayment.find({ project: { $in: projectIds } })
    .select('project amount amountInINR')
    .lean();
    
  const paymentMap = {};
  payments.forEach(p => {
    if (!paymentMap[p.project]) {
      paymentMap[p.project] = { total: 0, totalINR: 0, count: 0 };
    }
    paymentMap[p.project].total += p.amount || 0;
    paymentMap[p.project].totalINR += p.amountInINR || 0;
    paymentMap[p.project].count += 1;
  });
  
  return projects.map(p => ({
    ...p,
    paymentTotal: paymentMap[p._id]?.total || 0,
    paymentTotalINR: paymentMap[p._id]?.totalINR || 0,
    paymentCount: paymentMap[p._id]?.count || 0
  }));
}

exports.exportProjectCSV = async (req, res, next) => {
  try {
    const projects = await getProjectData(req);
    
    const data = projects.map(p => ({
      'Project Name': p.name,
      'Client': p.clientName,
      'Platform': p.platform?.name || '',
      'Status': p.status,
      'Price Type': p.priceType,
      'Fixed Price': p.fixedPrice || '',
      'Hourly Rate': p.hourlyRate || '',
      'Budget': p.budget || '',
      'Currency': p.currency,
      'Start Date': p.startDate?.toISOString().split('T')[0] || '',
      'End Date': p.endDate?.toISOString().split('T')[0] || '',
      'Total Payments': p.paymentCount,
      'Payment Total': p.paymentTotal,
      'Payment Total (INR)': p.paymentTotalINR
    }));
    
    const parser = new Parser();
    const csv = parser.parse(data);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`project-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

exports.exportProjectExcel = async (req, res, next) => {
  try {
    const projects = await getProjectData(req);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Project Report');
    
    worksheet.columns = [
      { header: 'Project Name', key: 'name', width: 25 },
      { header: 'Client', key: 'client', width: 20 },
      { header: 'Platform', key: 'platform', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Price Type', key: 'priceType', width: 12 },
      { header: 'Budget', key: 'budget', width: 12, style: { numFmt: '#,##0.00' } },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Start Date', key: 'startDate', width: 12 },
      { header: 'End Date', key: 'endDate', width: 12 },
      { header: 'Payments', key: 'paymentCount', width: 10 },
      { header: 'Total (INR)', key: 'totalINR', width: 15, style: { numFmt: '#,##0.00' } }
    ];
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF17A2B8' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    projects.forEach(p => {
      worksheet.addRow({
        name: p.name,
        client: p.clientName,
        platform: p.platform?.name || '',
        status: p.status,
        priceType: p.priceType,
        budget: p.budget || 0,
        currency: p.currency,
        startDate: p.startDate?.toISOString().split('T')[0] || '',
        endDate: p.endDate?.toISOString().split('T')[0] || '',
        paymentCount: p.paymentCount,
        totalINR: p.paymentTotalINR
      });
    });
    
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`project-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.exportProjectPDF = async (req, res, next) => {
  try {
    const projects = await getProjectData(req);
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.attachment(`project-report-${new Date().toISOString().split('T')[0]}.pdf`);
      res.send(pdfData);
    });
    
    doc.fontSize(24).font('Helvetica-Bold').text('Project Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();
    doc.fillColor('black');
    
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Total Projects: ${projects.length}`, 50, doc.y);
    doc.moveDown();
    
    const tableTop = doc.y;
    const itemHeight = 25;
    const pageHeight = 750;
    let yPos = tableTop;
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Project', 50, yPos, { width: 120 });
    doc.text('Client', 170, yPos, { width: 80 });
    doc.text('Platform', 250, yPos, { width: 70 });
    doc.text('Status', 320, yPos, { width: 60 });
    doc.text('Budget', 380, yPos, { width: 70, align: 'right' });
    doc.text('Payments', 450, yPos, { width: 50, align: 'right' });
    yPos += itemHeight;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    
    doc.fontSize(8).font('Helvetica');
    projects.forEach((p) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 50;
      }
      
      doc.text((p.name || '').substring(0, 25), 50, yPos, { width: 120 });
      doc.text((p.clientName || '').substring(0, 20), 170, yPos, { width: 80 });
      doc.text((p.platform?.name || '').substring(0, 15), 250, yPos, { width: 70 });
      doc.text(p.status || '', 320, yPos, { width: 60 });
      doc.text(`${p.budget || 0} ${p.currency}`, 380, yPos, { width: 70, align: 'right' });
      doc.text(p.paymentCount.toString(), 450, yPos, { width: 50, align: 'right' });
      yPos += itemHeight;
    });
    
    doc.end();
  } catch (err) {
    next(err);
  }
};

// ========== ACCOUNT/TRANSACTION REPORTS ==========

async function getAccountData(req) {
  const match = {};
  const { accountId, startDate, endDate } = req.query;
  
  if (accountId) {
    match.account = toObjectId(accountId);
  }
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) {
      const fromDate = new Date(startDate);
      if (!isNaN(fromDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        match.createdAt.$gte = fromDate;
      }
    }
    if (endDate) {
      const toDate = new Date(endDate);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        match.createdAt.$lte = toDate;
      }
    }
  }
  
  const transactions = await AccountTxn.find(match)
    .populate('account', 'name type')
    .sort({ createdAt: -1 })
    .lean();
    
  return transactions;
}

exports.exportAccountCSV = async (req, res, next) => {
  try {
    const transactions = await getAccountData(req);
    
    const data = transactions.map(t => ({
      'Date': t.createdAt?.toISOString().split('T')[0] || '',
      'Time': t.createdAt?.toISOString().split('T')[1]?.split('.')[0] || '',
      'Account': t.account?.name || '',
      'Account Type': t.account?.type || '',
      'Type': t.type,
      'Amount': t.amount,
      'Delta': t.delta,
      'Balance After': t.balanceAfter,
      'Reference Type': t.refType,
      'Remark': t.remark || ''
    }));
    
    const parser = new Parser();
    const csv = parser.parse(data);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`account-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

exports.exportAccountExcel = async (req, res, next) => {
  try {
    const transactions = await getAccountData(req);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Account Report');
    
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Time', key: 'time', width: 10 },
      { header: 'Account', key: 'account', width: 20 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Amount', key: 'amount', width: 12, style: { numFmt: '#,##0.00' } },
      { header: 'Delta', key: 'delta', width: 12, style: { numFmt: '#,##0.00' } },
      { header: 'Balance After', key: 'balance', width: 15, style: { numFmt: '#,##0.00' } },
      { header: 'Reference', key: 'refType', width: 12 },
      { header: 'Remark', key: 'remark', width: 40 }
    ];
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6F42C1' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    transactions.forEach(t => {
      worksheet.addRow({
        date: t.createdAt?.toISOString().split('T')[0] || '',
        time: t.createdAt?.toISOString().split('T')[1]?.split('.')[0] || '',
        account: t.account?.name || '',
        type: t.type,
        amount: t.amount,
        delta: t.delta,
        balance: t.balanceAfter,
        refType: t.refType,
        remark: t.remark || ''
      });
    });
    
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`account-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.exportAccountPDF = async (req, res, next) => {
  try {
    const transactions = await getAccountData(req);
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.attachment(`account-report-${new Date().toISOString().split('T')[0]}.pdf`);
      res.send(pdfData);
    });
    
    doc.fontSize(24).font('Helvetica-Bold').text('Account Transaction Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    if (req.query.startDate || req.query.endDate) {
      doc.text(`Period: ${req.query.startDate || 'All'} to ${req.query.endDate || 'All'}`, { align: 'center' });
    }
    doc.moveDown();
    doc.fillColor('black');
    
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Total Transactions: ${transactions.length}`, 50, doc.y);
    doc.moveDown();
    
    const tableTop = doc.y;
    const itemHeight = 20;
    const pageHeight = 750;
    let yPos = tableTop;
    
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Date', 50, yPos);
    doc.text('Account', 100, yPos, { width: 80 });
    doc.text('Type', 180, yPos, { width: 50 });
    doc.text('Amount', 230, yPos, { width: 70, align: 'right' });
    doc.text('Balance', 300, yPos, { width: 80, align: 'right' });
    doc.text('Remark', 380, yPos, { width: 120 });
    yPos += itemHeight;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    
    doc.fontSize(8).font('Helvetica');
    transactions.forEach((t) => {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 50;
      }
      
      const date = t.createdAt?.toISOString().split('T')[0] || '';
      const account = (t.account?.name || '').substring(0, 20);
      const type = t.type || '';
      const amount = `₹${(t.amount || 0).toLocaleString('en-IN')}`;
      const balance = `₹${(t.balanceAfter || 0).toLocaleString('en-IN')}`;
      const remark = (t.remark || '').substring(0, 30);
      
      doc.text(date, 50, yPos);
      doc.text(account, 100, yPos, { width: 80 });
      doc.text(type, 180, yPos, { width: 50 });
      doc.text(amount, 230, yPos, { width: 70, align: 'right' });
      doc.text(balance, 300, yPos, { width: 80, align: 'right' });
      doc.text(remark, 380, yPos, { width: 120 });
      yPos += itemHeight;
    });
    
    doc.end();
  } catch (err) {
    next(err);
  }
};

// ========== PROFIT & LOSS REPORT ==========

exports.exportProfitLossCSV = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get income
    const incomeMatch = {};
    if (startDate || endDate) {
      incomeMatch.paymentDate = {};
      if (startDate) {
        const fromDate = new Date(startDate);
        fromDate.setHours(0, 0, 0, 0);
        incomeMatch.paymentDate.$gte = fromDate;
      }
      if (endDate) {
        const toDate = new Date(endDate);
        toDate.setHours(23, 59, 59, 999);
        incomeMatch.paymentDate.$lte = toDate;
      }
    }
    
    if (req.query.scope === 'me' && req.user?.userId) {
      const projects = await Project.find({ createdBy: req.user.userId }).select('_id').lean();
      incomeMatch.project = { $in: projects.map(p => p._id) };
    }
    
    const payments = await ProjectPayment.find(incomeMatch).lean();
    const totalIncome = payments.reduce((sum, p) => sum + (p.amountInINR || 0), 0);
    
    // Get expenses
    const expenseMatch = buildDateFilter(req);
    if (req.query.scope === 'me' && req.user?.userId) {
      expenseMatch.createdBy = toObjectId(req.user.userId);
    }
    const expenses = await Expense.find(expenseMatch).lean();
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const profit = totalIncome - totalExpenses;
    
    const data = [
      { 'Category': 'Income', 'Amount': totalIncome },
      { 'Category': 'Expenses', 'Amount': totalExpenses },
      { 'Category': 'Profit/Loss', 'Amount': profit }
    ];
    
    const parser = new Parser();
    const csv = parser.parse(data);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`profit-loss-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

exports.exportProfitLossExcel = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const incomeMatch = {};
    if (startDate || endDate) {
      incomeMatch.paymentDate = {};
      if (startDate) {
        const fromDate = new Date(startDate);
        fromDate.setHours(0, 0, 0, 0);
        incomeMatch.paymentDate.$gte = fromDate;
      }
      if (endDate) {
        const toDate = new Date(endDate);
        toDate.setHours(23, 59, 59, 999);
        incomeMatch.paymentDate.$lte = toDate;
      }
    }
    
    if (req.query.scope === 'me' && req.user?.userId) {
      const projects = await Project.find({ createdBy: req.user.userId }).select('_id').lean();
      incomeMatch.project = { $in: projects.map(p => p._id) };
    }
    
    const payments = await ProjectPayment.find(incomeMatch).lean();
    const totalIncome = payments.reduce((sum, p) => sum + (p.amountInINR || 0), 0);
    
    const expenseMatch = buildDateFilter(req);
    if (req.query.scope === 'me' && req.user?.userId) {
      expenseMatch.createdBy = toObjectId(req.user.userId);
    }
    const expenses = await Expense.find(expenseMatch).lean();
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const profit = totalIncome - totalExpenses;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Profit & Loss');
    
    worksheet.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Amount (INR)', key: 'amount', width: 18, style: { numFmt: '#,##0.00' } }
    ];
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF28A745' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    worksheet.addRow({ category: 'Total Income', amount: totalIncome });
    worksheet.addRow({ category: 'Total Expenses', amount: totalExpenses });
    worksheet.addRow({ category: 'Net Profit/Loss', amount: profit });
    
    const lastRow = worksheet.lastRow;
    lastRow.font = { bold: true };
    if (profit < 0) {
      lastRow.getCell(2).font = { bold: true, color: { argb: 'FFFF0000' } };
    } else {
      lastRow.getCell(2).font = { bold: true, color: { argb: 'FF28A745' } };
    }
    
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment(`profit-loss-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

exports.exportProfitLossPDF = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const incomeMatch = {};
    if (startDate || endDate) {
      incomeMatch.paymentDate = {};
      if (startDate) {
        const fromDate = new Date(startDate);
        fromDate.setHours(0, 0, 0, 0);
        incomeMatch.paymentDate.$gte = fromDate;
      }
      if (endDate) {
        const toDate = new Date(endDate);
        toDate.setHours(23, 59, 59, 999);
        incomeMatch.paymentDate.$lte = toDate;
      }
    }
    
    if (req.query.scope === 'me' && req.user?.userId) {
      const projects = await Project.find({ createdBy: req.user.userId }).select('_id').lean();
      incomeMatch.project = { $in: projects.map(p => p._id) };
    }
    
    const payments = await ProjectPayment.find(incomeMatch).lean();
    const totalIncome = payments.reduce((sum, p) => sum + (p.amountInINR || 0), 0);
    
    const expenseMatch = buildDateFilter(req);
    if (req.query.scope === 'me' && req.user?.userId) {
      expenseMatch.createdBy = toObjectId(req.user.userId);
    }
    const expenses = await Expense.find(expenseMatch).lean();
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const profit = totalIncome - totalExpenses;
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.attachment(`profit-loss-report-${new Date().toISOString().split('T')[0]}.pdf`);
      res.send(pdfData);
    });
    
    doc.fontSize(24).font('Helvetica-Bold').text('Profit & Loss Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    if (startDate || endDate) {
      doc.text(`Period: ${startDate || 'All'} to ${endDate || 'All'}`, { align: 'center' });
    }
    doc.moveDown(2);
    doc.fillColor('black');
    
    const centerX = 300;
    const startY = doc.y;
    
    doc.fontSize(14).font('Helvetica-Bold').text('Total Income', centerX - 100, startY, { width: 200, align: 'right' });
    doc.fontSize(12).font('Helvetica').text(`₹${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, centerX + 20, startY);
    doc.moveDown();
    
    doc.fontSize(14).font('Helvetica-Bold').text('Total Expenses', centerX - 100, doc.y, { width: 200, align: 'right' });
    doc.fontSize(12).font('Helvetica').text(`₹${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, centerX + 20, doc.y);
    doc.moveDown();
    
    doc.moveTo(centerX - 100, doc.y).lineTo(centerX + 150, doc.y).stroke();
    doc.moveDown(0.5);
    
    doc.fontSize(16).font('Helvetica-Bold');
    if (profit < 0) {
      doc.fillColor('red');
    } else {
      doc.fillColor('green');
    }
    doc.text('Net Profit/Loss', centerX - 100, doc.y, { width: 200, align: 'right' });
    doc.text(`₹${profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, centerX + 20, doc.y);
    doc.fillColor('black');
    
    doc.end();
  } catch (err) {
    next(err);
  }
};

