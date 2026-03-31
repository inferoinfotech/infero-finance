const Task = require('../models/Task');
const TaskComment = require('../models/TaskComment');
const TaskActivity = require('../models/TaskActivity');
const TaskArchive = require('../models/TaskArchive');
const User = require('../models/User');
const { ROLES } = require('../models/User');
const { logHistory } = require('../utils/historyLogger');
const { createNotification } = require('./notificationController');

async function addActivity(taskId, userId, action, message) {
  await TaskActivity.create({ task: taskId, user: userId, action, message });
}

async function notifyUsers(userIds, taskId, title) {
  try {
    await Promise.all(
      Array.from(userIds).map((userId) =>
        createNotification({
          user: userId,
          type: 'task_assigned',
          message: `You were added to task: ${title}`,
          data: { taskId },
        })
      )
    );
  } catch (error) {
    console.error('Failed to send task notifications:', error);
  }
}

function buildVisibilityQuery(user) {
  if (!user) return {};
  if (user.role === ROLES.ADMIN) {
    return {};
  }
  return {
    $or: [
      { isGlobal: true },
      { createdBy: user.userId },
      { assignedTo: user.userId },
      { collaborators: user.userId },
      { assignedRole: user.role },
      { collaboratorRoles: user.role },
    ],
  };
}

function canAccessTask(task, user) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  const userId = user.userId?.toString();
  const toId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value._id) return value._id.toString();
    if (typeof value.toString === 'function') return value.toString();
    return null;
  };
  const assignedToId = toId(task.assignedTo);
  const createdById = toId(task.createdBy);
  const collaboratorIds = (task.collaborators || [])
    .map((c) => toId(c))
    .filter(Boolean);
  return (
    task.isGlobal === true ||
    createdById === userId ||
    assignedToId === userId ||
    collaboratorIds.includes(userId) ||
    task.assignedRole === user.role ||
    (task.collaboratorRoles || []).includes(user.role)
  );
}

// GET /api/tasks/users
// Scoped user list for task assignment/collaboration selectors.
exports.getTaskUsers = async (req, res, next) => {
  try {
    const users = await User.find({}, { name: 1, email: 1, role: 1 })
      .sort({ name: 1 })
      .lean();

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      project,
      assignedTo,
      assignedRole,
      collaborators,
      collaboratorRoles,
      isGlobal,
      subtasks,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const cleanSubtasks = Array.isArray(subtasks)
      ? subtasks
          .filter((s) => s && typeof s.title === 'string' && s.title.trim())
          .map((s) => ({
            title: s.title.trim(),
            done: !!s.done,
            assignedTo: s.assignedTo || undefined,
          }))
      : [];

    const task = await Task.create({
      title: title.trim(),
      description: description || '',
      status,
      priority,
      dueDate: dueDate || null,
      project: project || null,
      assignedTo: assignedTo || null,
      assignedRole: assignedRole || null,
      collaborators: Array.isArray(collaborators) ? collaborators : [],
      collaboratorRoles: Array.isArray(collaboratorRoles) ? collaboratorRoles : [],
      isGlobal: !!isGlobal,
      subtasks: cleanSubtasks,
      createdBy: req.user.userId,
    });

    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'Task',
      entityId: task._id,
      newValue: task.toObject(),
      description: `Created task: ${task.title}`,
    });

    await addActivity(task._id, req.user.userId, 'create', 'Task created');

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('project', 'name');

    const notifyUserIds = new Set();
    if (assignedTo) notifyUserIds.add(String(assignedTo));
    (Array.isArray(collaborators) ? collaborators : []).forEach((id) => notifyUserIds.add(String(id)));

    const roleTargets = new Set();
    if (assignedRole) roleTargets.add(assignedRole);
    (Array.isArray(collaboratorRoles) ? collaboratorRoles : []).forEach((role) => roleTargets.add(role));
    if (roleTargets.size > 0) {
      const roleUsers = await User.find({ role: { $in: Array.from(roleTargets) } }, { _id: 1 });
      roleUsers.forEach((u) => notifyUserIds.add(String(u._id)));
    }

    notifyUserIds.delete(String(req.user.userId));
    await notifyUsers(notifyUserIds, task._id, task.title);

    res.status(201).json({ task: populated });
  } catch (err) {
    next(err);
  }
};

exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, assignedTo, assignedRole, search, dueFrom, dueTo, project } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (assignedRole) filters.assignedRole = assignedRole;
    if (project) filters.project = project;
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (dueFrom || dueTo) {
      filters.dueDate = {};
      if (dueFrom) filters.dueDate.$gte = new Date(dueFrom);
      if (dueTo) filters.dueDate.$lte = new Date(dueTo);
    }

    const visibility = buildVisibilityQuery(req.user);
    const query = Object.keys(visibility).length
      ? { $and: [filters, visibility] }
      : filters;

    const tasks = await Task.find(query)
      .sort({ order: 1, createdAt: -1 })
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('project', 'name status');

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
};

exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('project', 'name');
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (!canAccessTask(task, req.user)) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) {
      task = await TaskArchive.findOne({ originalTaskId: req.params.id });
    }
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (!canAccessTask(task, req.user)) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    const oldValue = task.toObject();

    const fields = [
      'title',
      'description',
      'status',
      'priority',
      'dueDate',
      'project',
      'assignedTo',
      'assignedRole',
      'collaborators',
      'collaboratorRoles',
      'isGlobal',
      'subtasks',
      'order',
    ];
    fields.forEach((field) => {
      if (field in req.body) {
        if (field === 'title' && !req.body.title?.trim()) return;
        if (field === 'subtasks') {
          const next = Array.isArray(req.body.subtasks)
            ? req.body.subtasks
                .filter((s) => s && typeof s.title === 'string' && s.title.trim())
                .map((s) => ({
                  title: s.title.trim(),
                  done: !!s.done,
                  assignedTo: s.assignedTo || undefined,
                }))
            : [];
          task.subtasks = next;
          return;
        }
        if (field === 'dueDate') {
          task.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
          return;
        }
        if (field === 'isGlobal') {
          task.isGlobal = !!req.body.isGlobal;
          return;
        }
        task[field] = req.body[field] === '' ? null : req.body[field];
      }
    });

    await task.save();

    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'Task',
      entityId: task._id,
      oldValue,
      newValue: task.toObject(),
      description: `Updated task: ${task.title}`,
    });

    await addActivity(task._id, req.user.userId, 'update', 'Task updated');

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('project', 'name');

    const notifyUserIds = new Set();
    const oldAssignedTo = oldValue.assignedTo ? String(oldValue.assignedTo) : null;
    const newAssignedTo = task.assignedTo ? String(task.assignedTo) : null;
    if (newAssignedTo && newAssignedTo !== oldAssignedTo) notifyUserIds.add(newAssignedTo);

    const oldCollaborators = new Set((oldValue.collaborators || []).map((id) => String(id)));
    (task.collaborators || []).forEach((id) => {
      if (!oldCollaborators.has(String(id))) notifyUserIds.add(String(id));
    });

    const oldRoles = new Set(oldValue.collaboratorRoles || []);
    const newRoles = new Set(task.collaboratorRoles || []);
    if (task.assignedRole && task.assignedRole !== oldValue.assignedRole) newRoles.add(task.assignedRole);
    const addedRoles = Array.from(newRoles).filter((role) => !oldRoles.has(role));
    if (addedRoles.length > 0) {
      const roleUsers = await User.find({ role: { $in: addedRoles } }, { _id: 1 });
      roleUsers.forEach((u) => notifyUserIds.add(String(u._id)));
    }

    notifyUserIds.delete(String(req.user.userId));
    await notifyUsers(notifyUserIds, task._id, task.title);

    res.json({ task: populated });
  } catch (err) {
    next(err);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const isAdmin = req.user.role === ROLES.ADMIN || req.user.role === ROLES.OWNER;
    const isCreator = task.createdBy?.toString() === req.user.userId?.toString();
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    await logHistory({
      userId: req.user.userId,
      action: 'delete',
      entityType: 'Task',
      entityId: task._id,
      oldValue: task.toObject(),
      description: `Deleted task: ${task.title}`,
    });

    await Task.deleteOne({ _id: task._id });
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.getComments = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) {
      task = await TaskArchive.findOne({ originalTaskId: req.params.id });
    }
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (!canAccessTask(task, req.user)) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    const comments = await TaskComment.find({ task: task._id })
      .sort({ createdAt: 1 })
      .populate('user', 'name email role');
    res.json({ comments });
  } catch (err) {
    next(err);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }
    let task = await Task.findById(req.params.id);
    if (!task) {
      task = await TaskArchive.findOne({ originalTaskId: req.params.id });
    }
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (!canAccessTask(task, req.user)) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    const comment = await TaskComment.create({
      task: task._id,
      user: req.user.userId,
      text: text.trim(),
    });
    await addActivity(task._id, req.user.userId, 'comment', 'Added a comment');
    const populated = await TaskComment.findById(comment._id).populate('user', 'name email role');
    res.status(201).json({ comment: populated });
  } catch (err) {
    next(err);
  }
};

exports.getActivity = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    if (!canAccessTask(task, req.user)) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    const activity = await TaskActivity.find({ task: task._id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email role');
    res.json({ activity });
  } catch (err) {
    next(err);
  }
};

exports.archiveTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    const isAdmin = req.user.role === ROLES.ADMIN || req.user.role === ROLES.OWNER;
    const isCreator = task.createdBy?.toString() === req.user.userId?.toString();
    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    const archive = await TaskArchive.create({
      originalTaskId: task._id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      project: task.project,
      assignedTo: task.assignedTo,
      assignedRole: task.assignedRole,
      collaborators: task.collaborators,
      collaboratorRoles: task.collaboratorRoles,
      isGlobal: task.isGlobal,
      subtasks: task.subtasks,
      createdBy: task.createdBy,
      archivedBy: req.user.userId,
      archivedAt: new Date(),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    });

    await addActivity(task._id, req.user.userId, 'archive', 'Task archived');
    await logHistory({
      userId: req.user.userId,
      action: 'update',
      entityType: 'Task',
      entityId: task._id,
      oldValue: task.toObject(),
      newValue: { archived: true },
      description: `Archived task: ${task.title}`,
    });

    await Task.deleteOne({ _id: task._id });
    res.json({ archived: archive });
  } catch (err) {
    next(err);
  }
};

exports.getArchivedTasks = async (req, res, next) => {
  try {
    const visibility = buildVisibilityQuery(req.user);
    const query = Object.keys(visibility).length
      ? { $and: [{}, visibility] }
      : {};
    const archived = await TaskArchive.find(query)
      .sort({ archivedAt: -1 })
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('project', 'name');
    res.json({ tasks: archived });
  } catch (err) {
    next(err);
  }
};

exports.getArchivedTaskById = async (req, res, next) => {
  try {
    const task = await TaskArchive.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('project', 'name');
    if (!task) return res.status(404).json({ error: 'Archived task not found.' });
    if (!canAccessTask(task, req.user)) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    res.json({ task });
  } catch (err) {
    next(err);
  }
};

exports.unarchiveTask = async (req, res, next) => {
  try {
    const archived = await TaskArchive.findById(req.params.id);
    if (!archived) return res.status(404).json({ error: 'Archived task not found.' });
    if (!canAccessTask(archived, req.user)) {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    const taskData = {
      title: archived.title,
      description: archived.description || '',
      status: archived.status,
      priority: archived.priority,
      dueDate: archived.dueDate || null,
      project: archived.project?._id || archived.project || null,
      assignedTo: archived.assignedTo?._id || archived.assignedTo || null,
      assignedRole: archived.assignedRole || null,
      collaborators: Array.isArray(archived.collaborators)
        ? archived.collaborators.map((c) => (c && c._id ? c._id : c)).filter(Boolean)
        : [],
      collaboratorRoles: Array.isArray(archived.collaboratorRoles) ? archived.collaboratorRoles : [],
      isGlobal: !!archived.isGlobal,
      subtasks: Array.isArray(archived.subtasks)
        ? archived.subtasks.map((s) => ({
            title: s.title,
            done: !!s.done,
            assignedTo: s.assignedTo?._id || s.assignedTo || undefined,
          }))
        : [],
      createdBy: archived.createdBy?._id || archived.createdBy,
      order: 0,
    };

    const task = await Task.create(taskData);

    await addActivity(task._id, req.user.userId, 'unarchive', 'Task restored from archive');
    await logHistory({
      userId: req.user.userId,
      action: 'create',
      entityType: 'Task',
      entityId: task._id,
      newValue: task.toObject(),
      description: `Unarchived task: ${task.title}`,
    });

    await TaskArchive.deleteOne({ _id: archived._id });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email role')
      .populate('collaborators', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('project', 'name');
    res.json({ task: populated });
  } catch (err) {
    next(err);
  }
};
