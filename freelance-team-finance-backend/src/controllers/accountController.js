const Account = require('../models/Account');

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
