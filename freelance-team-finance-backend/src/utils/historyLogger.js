const History = require('../models/History');

/**
 * Log a history entry with automatic change detection
 * @param {Object} params
 * @param {string} params.userId - User ID performing the action
 * @param {string} params.action - Action type: "create", "update", "delete", "login"
 * @param {string} params.entityType - Entity type: "Project", "Expense", "Account", etc.
 * @param {string|ObjectId} params.entityId - Entity ID (optional for login)
 * @param {Object} params.oldValue - Previous value (for update/delete)
 * @param {Object} params.newValue - New value (for create/update)
 * @param {string} params.description - Human-readable description
 * @param {Object} params.metadata - Additional metadata (IP, user agent, etc.)
 */
async function logHistory({ userId, action, entityType, entityId, oldValue, newValue, description, metadata = {} }) {
  try {
    // Skip logging if userId is not provided (shouldn't happen, but safety check)
    if (!userId) {
      console.warn('History logging skipped: userId is required');
      return;
    }
    // Calculate changes for update actions
    let changes = {};
    if (action === 'update' && oldValue && newValue) {
      const oldObj = typeof oldValue === 'object' && oldValue !== null ? oldValue : {};
      const newObj = typeof newValue === 'object' && newValue !== null ? newValue : {};
      
      // Get all unique keys
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
      
      // Filter out internal fields
      const excludeFields = ['_id', '__v', 'createdAt', 'updatedAt', 'password'];
      
      for (const key of allKeys) {
        if (excludeFields.includes(key)) continue;
        
        const oldVal = oldObj[key];
        const newVal = newObj[key];
        
        // Compare values (handle ObjectId comparison)
        const oldStr = oldVal && oldVal.toString ? oldVal.toString() : oldVal;
        const newStr = newVal && newVal.toString ? newVal.toString() : newVal;
        
        if (oldStr !== newStr) {
          changes[key] = {
            old: oldVal,
            new: newVal
          };
        }
      }
    } else if (action === 'create' && newValue) {
      // For create, show all fields (except internal ones)
      const newObj = typeof newValue === 'object' && newValue !== null ? newValue : {};
      const excludeFields = ['_id', '__v', 'createdAt', 'updatedAt', 'password'];
      for (const key of Object.keys(newObj)) {
        if (excludeFields.includes(key)) continue;
        changes[key] = { new: newObj[key] };
      }
    } else if (action === 'delete' && oldValue) {
      // For delete, show what was deleted
      const oldObj = typeof oldValue === 'object' && oldValue !== null ? oldValue : {};
      const excludeFields = ['_id', '__v', 'createdAt', 'updatedAt', 'password'];
      for (const key of Object.keys(oldObj)) {
        if (excludeFields.includes(key)) continue;
        changes[key] = { old: oldObj[key] };
      }
    }

    // Generate description if not provided
    if (!description) {
      const entityName = getEntityName(oldValue || newValue, entityType);
      switch (action) {
        case 'create':
          description = `Created ${entityType}: ${entityName}`;
          break;
        case 'update':
          description = `Updated ${entityType}: ${entityName}`;
          break;
        case 'delete':
          description = `Deleted ${entityType}: ${entityName}`;
          break;
        case 'login':
          description = `User logged in`;
          break;
        default:
          description = `${action} ${entityType}`;
      }
    }

    await History.create({
      user: userId,
      action,
      entityType,
      entityId: entityId || null,
      description,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
      metadata,
      timestamp: new Date()
    });
  } catch (error) {
    // Don't throw - history logging should not break the main flow
    console.error('Failed to log history:', error);
  }
}

/**
 * Get entity name from object
 */
function getEntityName(obj, entityType) {
  if (!obj || typeof obj !== 'object') return entityType;
  
  // Try common name fields
  if (obj.name) return obj.name;
  if (obj.title) return obj.title;
  if (obj.clientName) return obj.clientName;
  if (obj.email) return obj.email;
  if (obj._id) return obj._id.toString();
  
  return entityType;
}

module.exports = { logHistory };

