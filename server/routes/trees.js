const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getTreeGraph } = require('../utils/graphTraversal');

const router = express.Router();

// Generate a URL-safe slug from Arabic text
function generateSlug(name) {
  const base = name
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FF\w-]/g, '')
    .substring(0, 50);
  const suffix = uuidv4().substring(0, 8);
  return `${base}-${suffix}`;
}

// POST /api/trees — create a new tree
router.post('/', requireAuth, [
  body('name').notEmpty().withMessage('اسم الشجرة مطلوب'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, slug: customSlug } = req.body;
  const slug = customSlug || generateSlug(name);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create tree with traversal config
    const { rows } = await client.query(
      `INSERT INTO family_trees (name, description, slug, created_by, traversal_mode, depth_limit)
       VALUES ($1, $2, $3, $4, 'descendants', 20)
       RETURNING *`,
      [name, description || null, slug, req.user.id]
    );
    const tree = rows[0];

    // Auto-create admin membership
    await client.query(
      `INSERT INTO tree_members (user_id, family_tree_id, role)
       VALUES ($1, $2, 'admin')`,
      [req.user.id, tree.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ tree });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505' && err.constraint?.includes('slug')) {
      return res.status(400).json({ error: 'هذا الرابط مستخدم بالفعل' });
    }
    console.error('Create tree error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

// GET /api/trees — list my trees (or all trees for global admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    let rows;
    if (req.user.isAdmin) {
      // Global admin sees all trees
      const result = await pool.query(
        `SELECT ft.*, 'admin' as role,
          u.name as owner_name,
          COALESCE(
            (SELECT COUNT(*) FROM get_tree_person_ids(ft.root_person_id, ft.traversal_mode, ft.depth_limit)),
            0
          ) as person_count
         FROM family_trees ft
         LEFT JOIN users u ON u.id = ft.created_by
         ORDER BY ft.updated_at DESC`
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `SELECT ft.*, tm.role,
          COALESCE(
            (SELECT COUNT(*) FROM get_tree_person_ids(ft.root_person_id, ft.traversal_mode, ft.depth_limit)),
            0
          ) as person_count
         FROM family_trees ft
         JOIN tree_members tm ON tm.family_tree_id = ft.id
         WHERE tm.user_id = $1
         ORDER BY ft.updated_at DESC`,
        [req.user.id]
      );
      rows = result.rows;
    }

    res.json({ trees: rows });
  } catch (err) {
    console.error('List trees error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/trees/:slug — get tree by slug (public)
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    // Get tree
    const { rows: trees } = await pool.query(
      `SELECT * FROM family_trees WHERE slug = $1`,
      [req.params.slug]
    );

    if (trees.length === 0) {
      return res.status(404).json({ error: 'الشجرة غير موجودة' });
    }

    const tree = trees[0];

    // Allow depth override via query param
    const depthLimit = req.query.depth
      ? Math.min(parseInt(req.query.depth) || tree.depth_limit, 50)
      : tree.depth_limit || 20;

    // Get persons and spouses via graph traversal
    const { persons, spouses, hasMore } = await getTreeGraph(
      tree.root_person_id,
      tree.traversal_mode || 'descendants',
      depthLimit
    );

    // Check if user is admin and get linked person
    let isAdmin = false;
    let linkedPersonId = null;
    if (req.user) {
      // Global admin has full access to all trees
      if (req.user.isAdmin) {
        isAdmin = true;
      }
      const { rows: members } = await pool.query(
        `SELECT role, linked_person_id FROM tree_members WHERE user_id = $1 AND family_tree_id = $2`,
        [req.user.id, tree.id]
      );
      if (members.length > 0) {
        isAdmin = isAdmin || members[0].role === 'admin';
        linkedPersonId = members[0].linked_person_id || null;
      }
    }

    res.json({ tree, persons, spouses, isAdmin, linkedPersonId, hasMore });
  } catch (err) {
    console.error('Get tree error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// PUT /api/trees/:id — update tree
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Global admin bypasses membership check
    if (!req.user.isAdmin) {
      const { rows: members } = await pool.query(
        `SELECT role FROM tree_members WHERE user_id = $1 AND family_tree_id = $2`,
        [userId, id]
      );
      if (members.length === 0 || members[0].role !== 'admin') {
        return res.status(403).json({ error: 'ليس لديك صلاحية التعديل' });
      }
    }

    const { name, description, slug, root_person_id, traversal_mode, depth_limit } = req.body;
    const { rows } = await pool.query(
      `UPDATE family_trees
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           slug = COALESCE($3, slug),
           root_person_id = COALESCE($4, root_person_id),
           traversal_mode = COALESCE($5, traversal_mode),
           depth_limit = COALESCE($6, depth_limit),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, slug, root_person_id, traversal_mode, depth_limit, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'الشجرة غير موجودة' });
    }

    res.json({ tree: rows[0] });
  } catch (err) {
    console.error('Update tree error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/trees/:id — delete tree
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Global admin bypasses membership check
    if (!req.user.isAdmin) {
      const { rows: members } = await pool.query(
        `SELECT role FROM tree_members WHERE user_id = $1 AND family_tree_id = $2`,
        [userId, id]
      );
      if (members.length === 0 || members[0].role !== 'admin') {
        return res.status(403).json({ error: 'ليس لديك صلاحية الحذف' });
      }
    }

    // Must clear root_person_id before deleting (circular FK)
    await pool.query(`UPDATE family_trees SET root_person_id = NULL WHERE id = $1`, [id]);
    await pool.query(`DELETE FROM family_trees WHERE id = $1`, [id]);

    res.json({ message: 'تم حذف الشجرة بنجاح' });
  } catch (err) {
    console.error('Delete tree error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
