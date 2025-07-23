const Expense = require('../models/Expense');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');

// CSV Export
exports.exportExpensesCSV = async (req, res, next) => {
  try {
    const expenses = await Expense.find().populate('withdrawAccount', 'name').populate('createdBy', 'name email').lean();

    const data = expenses.map(exp => ({
      type: exp.type,
      name: exp.name,
      amount: exp.amount,
      currency: exp.currency,
      date: exp.date?.toISOString().split('T')[0],
      withdrawAccount: exp.withdrawAccount?.name || '',
      createdBy: exp.createdBy?.name || '',
      notes: exp.notes || ''
    }));

    const fields = ['type', 'name', 'amount', 'currency', 'date', 'withdrawAccount', 'createdBy', 'notes'];
    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('expenses.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// Excel Export
exports.exportExpensesExcel = async (req, res, next) => {
  try {
    const expenses = await Expense.find().populate('withdrawAccount', 'name').populate('createdBy', 'name email').lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expenses');

    worksheet.columns = [
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Currency', key: 'currency', width: 8 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Withdraw Account', key: 'withdrawAccount', width: 18 },
      { header: 'Created By', key: 'createdBy', width: 18 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    expenses.forEach(exp => {
      worksheet.addRow({
        type: exp.type,
        name: exp.name,
        amount: exp.amount,
        currency: exp.currency,
        date: exp.date?.toISOString().split('T')[0],
        withdrawAccount: exp.withdrawAccount?.name || '',
        createdBy: exp.createdBy?.name || '',
        notes: exp.notes || ''
      });
    });

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('expenses.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

// PDF Export
exports.exportExpensesPDF = async (req, res, next) => {
  try {
    const expenses = await Expense.find().populate('withdrawAccount', 'name').populate('createdBy', 'name email').lean();

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=expenses.pdf');
      res.send(pdfData);
    });

    doc.fontSize(18).text('Expenses Report', { align: 'center' });
    doc.moveDown();

    // Table headers
    doc.fontSize(10).text('Type', 30, doc.y, { width: 55, align: 'left' });
    doc.text('Name', 85, doc.y, { width: 85, align: 'left' });
    doc.text('Amount', 170, doc.y, { width: 45, align: 'right' });
    doc.text('Currency', 215, doc.y, { width: 40, align: 'left' });
    doc.text('Date', 255, doc.y, { width: 60, align: 'left' });
    doc.text('Account', 315, doc.y, { width: 80, align: 'left' });
    doc.text('User', 395, doc.y, { width: 70, align: 'left' });
    doc.text('Notes', 465, doc.y, { width: 120, align: 'left' });
    doc.moveDown(0.5);
    doc.moveTo(30, doc.y).lineTo(570, doc.y).stroke();

    // Table rows
    expenses.forEach(exp => {
      doc.fontSize(9).text(exp.type, 30, doc.y, { width: 55 });
      doc.text(exp.name, 85, doc.y, { width: 85 });
      doc.text(exp.amount.toString(), 170, doc.y, { width: 45, align: 'right' });
      doc.text(exp.currency, 215, doc.y, { width: 40 });
      doc.text(exp.date?.toISOString().split('T')[0], 255, doc.y, { width: 60 });
      doc.text(exp.withdrawAccount?.name || '', 315, doc.y, { width: 80 });
      doc.text(exp.createdBy?.name || '', 395, doc.y, { width: 70 });
      doc.text(exp.notes || '', 465, doc.y, { width: 120 });
      doc.moveDown(0.4);
    });

    doc.end();
  } catch (err) {
    next(err);
  }
};
