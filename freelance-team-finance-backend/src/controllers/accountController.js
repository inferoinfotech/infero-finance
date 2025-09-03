const Account = require('../models/Account');
const AccountTxn = require('../models/AccountTxn');

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
    const updated = await Account.findOneAndUpdate(
      { _id: accountId, user: req.user.userId },
      { name, details },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Account not found' });
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
    res.json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
};


exports.getAccountStatement = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const skip = Math.max(Number(req.query.skip || 0), 0);

    // ensure account belongs to user
    const acc = await Account.findOne({ _id: accountId, user: req.user.userId });
    if (!acc) return res.status(404).json({ error: 'Account not found' });

    const txns = await AccountTxn.find({ account: accountId, user: req.user.userId })
      .sort({ createdAt: 1 }) // oldest -> newest; change to -1 for newest first
      .skip(skip)
      .limit(limit);

    res.json({ account: { _id: acc._id, name: acc.name, type: acc.type, balance: acc.balance }, txns });
  } catch (err) {
    next(err);
  }
};
