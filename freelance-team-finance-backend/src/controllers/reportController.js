// controllers/reportController.js
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const ProjectPayment = require('../models/ProjectPayment');

const toObjectId = (id) => {
  try { return new mongoose.Types.ObjectId(id) } catch { return null }
}

/**
 * Build a MongoDB $match object from query params
 * Supports: scope=me, type, from, to
 */
function buildMatch(req, fixed = {}) {
  const match = { ...fixed };

  // Scope
  // scope=me -> only this user's expenses
  if (req.query.scope === 'me' && req.user?.userId) {
    const uid = toObjectId(req.user.userId);
    if (uid) match.createdBy = uid;
  }

  // Optional explicit type filter via query (?type=general|personal|...)
  if (req.query.type) {
    match.type = req.query.type;
  }

  // Date range
  // from/to can be ISO date (YYYY-MM-DD), or just YYYY-MM (we’ll parse to first/last day)
  const { from, to } = req.query;
  if (from || to) {
    match.date = {};
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) match.date.$gte = fromDate;
    }
    if (to) {
      // If user provides YYYY-MM, push to last day of the month 23:59:59
      let toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        // If to is YYYY-MM (no day), set to last day of that month
        const str = to.trim();
        if (/^\d{4}-\d{2}$/.test(str)) {
          const [y, m] = str.split('-').map(Number);
          toDate = new Date(y, m, 0, 23, 59, 59, 999); // last day of month m
        } else {
          // Else, set end-of-day for provided date
          toDate.setHours(23, 59, 59, 999);
        }
        match.date.$lte = toDate;
      }
    }
  }

  return match;
}

/**
 * Build a $group stage for day/month/year
 */
function buildGroupStage(groupBy) {
  // default month
  const fmt =
    groupBy === 'day' ? '%Y-%m-%d'
    : groupBy === 'year' ? '%Y'
    : '%Y-%m';

  // Use $dateToString to normalize by calendar unit
  return [
    {
      $group: {
        _id: { $dateToString: { format: fmt, date: '$date' } },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        // Return unified field: month/day/year -> "month"
        month: '$_id',
        total: 1,
      },
    },
  ];
}

/**
 * Generic aggregator
 */
async function aggregateExpenses(req, fixedMatch = {}) {
  const groupBy = (req.query.groupBy || 'month').toLowerCase(); // day|month|year
  const match = buildMatch(req, fixedMatch);

  const pipeline = [{ $match: match }, ...buildGroupStage(groupBy)];
  const result = await Expense.aggregate(pipeline);
  return result;
}

/**
 * GET /api/reports/expenses?groupBy=month&scope=me&from=2025-01&to=2025-12
 * All expense types
 */
exports.expenses = async (req, res, next) => {
  try {
    const data = await aggregateExpenses(req);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reports/general-expenses?groupBy=month&scope=me
 * Only type === 'general'
 */
exports.generalExpenses = async (req, res, next) => {
  try {
    const data = await aggregateExpenses(req, { type: 'general' });
    res.json(data);
  } catch (err) {
    next(err);
  }
};


function buildIncomeGroupStage(groupBy) {
  const fmt =
    groupBy === 'day' ? '%Y-%m-%d'
    : groupBy === 'year' ? '%Y'
    : '%Y-%m';

  return [
    {
      $group: {
        _id: { $dateToString: { format: fmt, date: '$__dateForGroup' } },
        total: { $sum: '$amountInINR' }, // use INR for charting
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        month: '$_id', // unified key; frontend already maps this to label
        total: 1,
      },
    },
  ];
}

function buildIncomePipeline(req) {
  const groupBy = (req.query.groupBy || 'month').toLowerCase(); // day|month|year
  const match = {};

  // Optional status filters
  const { walletStatus, bankStatus, platformWallet, bankAccount } = req.query;
  if (walletStatus) match.walletStatus = walletStatus; // e.g., on_hold | released
  if (bankStatus) match.bankStatus = bankStatus;       // e.g., pending | received
  if (platformWallet) match.platformWallet = toObjectId(platformWallet);
  if (bankAccount) match.bankAccount = toObjectId(bankAccount);

  const pipeline = [
    { $match: match },

    // Normalize date field for grouping (prefer paymentDate, fallback createdAt)
    {
      $addFields: {
        __dateForGroup: { $ifNull: ['$paymentDate', '$createdAt'] }
      }
    },
  ];

  // Date range
  const { from, to } = req.query;
  if (from || to) {
    const dateMatch = {};
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) dateMatch.$gte = fromDate;
    }
    if (to) {
      let toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        // If only YYYY-MM, push to EOM 23:59:59.999
        const str = to.trim();
        if (/^\d{4}-\d{2}$/.test(str)) {
          const [y, m] = str.split('-').map(Number);
          toDate = new Date(y, m, 0, 23, 59, 59, 999);
        } else {
          toDate.setHours(23, 59, 59, 999);
        }
        dateMatch.$lte = toDate;
      }
    }
    if (Object.keys(dateMatch).length) {
      pipeline.push({ $match: { __dateForGroup: dateMatch } });
    }
  }

  // Scope=me -> only include payments from projects owned by current user
  if (req.query.scope === 'me' && req.user?.userId) {
    pipeline.push(
      {
        $lookup: {
          from: 'projects',
          localField: 'project',
          foreignField: '_id',
          as: '__project'
        }
      },
      { $unwind: '$__project' },
      { $match: { '__project.createdBy': toObjectId(req.user.userId) } }
    );
  }

  // Group
  pipeline.push(...buildIncomeGroupStage(groupBy));
  return pipeline;
}

// ----- CONTROLLER: INCOME -----

/**
 * GET /api/reports/income?groupBy=month
 * Optional:
 *   - scope=me
 *   - from=YYYY-MM or YYYY-MM-DD
 *   - to=YYYY-MM or YYYY-MM-DD
 *   - walletStatus=on_hold|released
 *   - bankStatus=pending|received
 *   - platformWallet=<accountId>
 *   - bankAccount=<accountId>
 *
 * Returns: [{ month: "2025-01", total: 12345 }, ...]
 */
exports.income = async (req, res, next) => {
  try {
    const pipeline = buildIncomePipeline(req);
    const data = await ProjectPayment.aggregate(pipeline);
    res.json(data);
  } catch (err) {
    next(err);
  }
};
