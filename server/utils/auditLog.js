const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

/**
 * Log an audit entry for a CUD operation
 * @param {Object} params
 * @param {string|null} params.familyTreeId - The tree this action belongs to (nullable for global operations)
 * @param {string} params.action - 'add', 'edit', or 'delete'
 * @param {string} params.entityType - 'person' or 'spouse'
 * @param {string} params.entityId - The ID of the entity being changed
 * @param {string} params.changedBy - User ID who made the change
 * @param {Object|null} params.oldValue - Previous value (for edit/delete)
 * @param {Object|null} params.newValue - New value (for add/edit)
 */
async function logAudit({ familyTreeId = null, action, entityType, entityId, changedBy, oldValue = null, newValue = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (id, family_tree_id, action, entity_type, entity_id, changed_by, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), familyTreeId || null, action, entityType, entityId, changedBy,
       oldValue ? JSON.stringify(oldValue) : null,
       newValue ? JSON.stringify(newValue) : null]
    );
  } catch (err) {
    // Audit logging should not break the main operation
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
