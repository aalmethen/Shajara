const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { requireTreeAdmin } = require('../middleware/treeAccess');

const router = express.Router({ mergeParams: true });

// POST /api/trees/:treeId/members — add member
router.post('/', requireAuth, requireTreeAdmin, [
  body('email').isEmail().withMessage('بريد إلكتروني غير صالح'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { treeId } = req.params;
  const { email, role, linked_person_id } = req.body;

  try {
    // Find user by email
    const { rows: users } = await pool.query(
      'SELECT id FROM users WHERE email = $1', [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود - يجب التسجيل أولاً' });
    }

    const userId = users[0].id;

    const { rows } = await pool.query(
      `INSERT INTO tree_members (user_id, family_tree_id, role, linked_person_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, treeId, role || 'viewer', linked_person_id || null]
    );

    res.status(201).json({ member: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'المستخدم عضو بالفعل في هذه الشجرة' });
    }
    console.error('Add member error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/trees/:treeId/members — list members
router.get('/', requireAuth, requireTreeAdmin, async (req, res) => {
  const { treeId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT tm.*, u.email, u.name as user_name,
        p.first_name as linked_person_name
       FROM tree_members tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN persons p ON p.id = tm.linked_person_id
       WHERE tm.family_tree_id = $1
       ORDER BY tm.created_at`,
      [treeId]
    );

    res.json({ members: rows });
  } catch (err) {
    console.error('List members error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// PUT /api/trees/:treeId/members/:id — change role
router.put('/:id', requireAuth, requireTreeAdmin, async (req, res) => {
  const { treeId, id } = req.params;
  const { role, linked_person_id } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE tree_members SET
        role = COALESCE($1, role),
        linked_person_id = $2
       WHERE id = $3 AND family_tree_id = $4
       RETURNING *`,
      [role, linked_person_id !== undefined ? linked_person_id : null, id, treeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'العضو غير موجود' });
    }

    res.json({ member: rows[0] });
  } catch (err) {
    console.error('Update member error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/trees/:treeId/members/:id — remove member
router.delete('/:id', requireAuth, requireTreeAdmin, async (req, res) => {
  const { treeId, id } = req.params;

  try {
    const { rows } = await pool.query(
      'DELETE FROM tree_members WHERE id = $1 AND family_tree_id = $2 RETURNING *',
      [id, treeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'العضو غير موجود' });
    }

    res.json({ message: 'تم إزالة العضو بنجاح' });
  } catch (err) {
    console.error('Delete member error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
