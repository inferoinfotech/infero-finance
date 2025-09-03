// utils/ledger.js
const Account = require('../models/Account');
const AccountTxn = require('../models/AccountTxn');

/**
 * Apply a delta to an account balance and write a ledger row with closing balance.
 * @param {Object} params
 * @param {ObjectId} params.userId
 * @param {ObjectId} params.accountId
 * @param {'credit'|'debit'} params.type
 * @param {number} params.amount        // positive
 * @param {string} params.refType       // 'payment' | 'expense' | 'transfer' | 'reversal' | 'manual'
 * @param {ObjectId} [params.refId]
 * @param {string} [params.remark]
 * @param {ClientSession|null} [session]
 */
async function postAccountTxn({ userId, accountId, type, amount, refType, refId, remark }, session = null) {
  const positive = Math.abs(Number(amount || 0));
  const delta = type === 'credit' ? +positive : -positive;

  // update balance and fetch new balance
  const updated = await Account.findByIdAndUpdate(
    accountId,
    { $inc: { balance: delta } },
    { new: true, ...(session ? { session } : {}) }
  );

  if (!updated) throw new Error('Account not found for ledger post');

  // write ledger row
  const txn = await AccountTxn.create([{
    user: userId,
    account: accountId,
    type,
    amount: positive,
    delta,
    balanceAfter: updated.balance,
    refType,
    refId,
    remark,
  }], ...(session ? [{ session }] : []));

  return txn[0];
}

module.exports = { postAccountTxn };
