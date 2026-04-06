const Todo = require('../models/Todo');

exports.getTodos = async (req, res, next) => {
  try {
    const todos = await Todo.find({ user: req.user.userId }).sort({ order: 1, createdAt: 1 });
    res.json({ todos });
  } catch (err) {
    next(err);
  }
};

exports.createTodo = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Todo text is required' });
    }
    const last = await Todo.findOne({ user: req.user.userId }).sort({ order: -1 }).select('order');
    const nextOrder = (last?.order || 0) + 1000;
    const todo = await Todo.create({
      user: req.user.userId,
      text: String(text).trim(),
      done: false,
      order: nextOrder,
    });
    res.status(201).json({ todo });
  } catch (err) {
    next(err);
  }
};

exports.updateTodo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, done } = req.body;

    const update = {};
    if (text !== undefined) update.text = String(text).trim();
    if (done !== undefined) update.done = Boolean(done);

    if (update.text !== undefined && !update.text) {
      return res.status(400).json({ error: 'Todo text cannot be empty' });
    }

    const todo = await Todo.findOneAndUpdate(
      { _id: id, user: req.user.userId },
      { $set: update },
      { new: true }
    );
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json({ todo });
  } catch (err) {
    next(err);
  }
};

exports.deleteTodo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findOneAndDelete({ _id: id, user: req.user.userId });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.reorderTodos = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const bulkOps = orderedIds.map((id, idx) => ({
      updateOne: {
        filter: { _id: id, user: req.user.userId },
        update: { $set: { order: (idx + 1) * 1000 } },
      },
    }));

    await Todo.bulkWrite(bulkOps, { ordered: false });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

