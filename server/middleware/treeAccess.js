const pool = require('../db/pool');
const { canUserEditPerson } = require('../utils/graphTraversal');

// Check if the authenticated user is an admin of the specified tree
async function requireTreeAdmin(req, res, next) {
  const treeId = req.params.treeId;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  // Global admin bypasses tree-level checks
  if (req.user.isAdmin) {
    req.treeRole = 'admin';
    return next();
  }

  try {
    const { rows } = await pool.query(
      `SELECT role FROM tree_members WHERE user_id = $1 AND family_tree_id = $2`,
      [userId, treeId]
    );

    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'ليس لديك صلاحية التعديل على هذه الشجرة' });
    }

    req.treeRole = 'admin';
    next();
  } catch (err) {
    console.error('Tree access check error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

// Check if tree is accessible (public via slug or user is a member)
async function requireTreeAccess(req, res, next) {
  const treeId = req.params.treeId;
  const userId = req.user?.id;

  // Global admin can access any tree
  if (req.user?.isAdmin) {
    req.treeRole = 'admin';
    return next();
  }

  try {
    // First check if tree exists
    const { rows: trees } = await pool.query(
      `SELECT id, slug FROM family_trees WHERE id = $1`,
      [treeId]
    );

    if (trees.length === 0) {
      return res.status(404).json({ error: 'الشجرة غير موجودة' });
    }

    // Tree has a slug = publicly accessible
    if (trees[0].slug) {
      return next();
    }

    // No slug = private, check membership
    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const { rows: members } = await pool.query(
      `SELECT role FROM tree_members WHERE user_id = $1 AND family_tree_id = $2`,
      [userId, treeId]
    );

    if (members.length === 0) {
      return res.status(403).json({ error: 'ليس لديك صلاحية عرض هذه الشجرة' });
    }

    req.treeRole = members[0].role;
    next();
  } catch (err) {
    console.error('Tree access check error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

/**
 * Check if user can edit a specific person.
 * Global admin can edit any person.
 * User can edit if they created the person, or are admin of any tree that reaches the person.
 * Expects req.params.id (personId) and req.user.id (userId).
 */
async function requirePersonEditAccess(req, res, next) {
  const personId = req.params.id;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'غير مصرح' });
  }

  // Global admin can edit any person
  if (req.user.isAdmin) {
    return next();
  }

  try {
    const canEdit = await canUserEditPerson(userId, personId);
    if (!canEdit) {
      return res.status(403).json({ error: 'ليس لديك صلاحية تعديل هذا الشخص' });
    }
    next();
  } catch (err) {
    console.error('Person edit access check error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
}

module.exports = { requireTreeAdmin, requireTreeAccess, requirePersonEditAccess };
