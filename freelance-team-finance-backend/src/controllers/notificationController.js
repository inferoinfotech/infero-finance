const Notification = require('../models/Notification');

// Create notification (call this from anywhere!)
exports.createNotification = async ({ user, type, message, data }) => {
  await Notification.create({ user, type, message, data });
};

// Get notifications for logged-in user
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
};

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user.userId },
      { read: true }
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};
