const Project = require('../models/Project');
const ProjectPayment = require('../models/ProjectPayment');
const Account = require('../models/Account');
const Expense = require('../models/Expense');

// Get team-wide financial summary
exports.getTeamSummary = async (req, res, next) => {
  try {
    // Sum all payments that are released to bank
    const totalBankReceived = await ProjectPayment.aggregate([
      { $match: { bankStatus: 'released' } },
      { $group: { _id: null, total: { $sum: '$amountInINR' } } }
    ]);
    // Pending in wallets
    const totalWalletPending = await ProjectPayment.aggregate([
      { $match: { walletStatus: { $in: ['on_hold', 'released'] }, bankStatus: { $ne: 'released' } } },
      { $group: { _id: null, total: { $sum: '$amountInINR' } } }
    ]);
    // Total expenses
    const totalExpenses = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    // Total by account
    const accounts = await Account.find().select('name type balance');
    // All project count, etc.
    const projects = await Project.find().countDocuments();

    res.json({
      totalBankReceived: totalBankReceived[0]?.total || 0,
      totalWalletPending: totalWalletPending[0]?.total || 0,
      totalExpenses: totalExpenses[0]?.total || 0,
      accounts,
      projects
    });
  } catch (err) {
    next(err);
  }
};

// Per-user financial summary
exports.getUserSummary = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    // Released to this user's bank
    const totalBankReceived = await ProjectPayment.aggregate([
      { $match: { bankStatus: 'released' } },
      { $lookup: {
          from: 'accounts',
          localField: 'bankAccount',
          foreignField: '_id',
          as: 'bankAcc'
        }
      },
      { $unwind: '$bankAcc' },
      { $match: { 'bankAcc.user': userId } },
      { $group: { _id: null, total: { $sum: '$amountInINR' } } }
    ]);
    // User's expenses
    const totalExpenses = await Expense.aggregate([
      { $match: { createdBy: userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    // User's accounts
    const accounts = await Account.find({ user: userId }).select('name type balance');
    // User's project count
    const projects = await Project.find({ createdBy: userId }).countDocuments();

    res.json({
      totalBankReceived: totalBankReceived[0]?.total || 0,
      totalExpenses: totalExpenses[0]?.total || 0,
      accounts,
      projects
    });
  } catch (err) {
    next(err);
  }
};
