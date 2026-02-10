const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { requirePersonEditAccess } = require('../middleware/treeAccess');
const { logAudit } = require('../utils/auditLog');

const router = express.Router({ mergeParams: true });

// POST /api/trees/:treeId/spouses — add spouse relationship
router.post('/', requireAuth, [
  body('person_a_id').isUUID().withMessage('معرف الشخص الأول مطلوب'),
  body('person_b_id').isUUID().withMessage('معرف الشخص الثاني مطلوب'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { person_a_id, person_b_id, marriage_date, divorce_date, marriage_order, status } = req.body;

  try {
    // Validate both persons exist globally
    const { rows: personRows } = await pool.query(
      `SELECT id FROM persons WHERE id IN ($1, $2)`,
      [person_a_id, person_b_id]
    );

    if (personRows.length < 2) {
      return res.status(400).json({ error: 'أحد الأشخاص غير موجود' });
    }

    const { rows } = await pool.query(
      `INSERT INTO spouses (person_a_id, person_b_id, marriage_date, divorce_date, marriage_order, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [person_a_id, person_b_id, marriage_date || null, divorce_date || null,
       marriage_order || 1, status || 'married', req.user.id]
    );

    await logAudit({
      familyTreeId: null,
      action: 'add',
      entityType: 'spouse',
      entityId: rows[0].id,
      changedBy: req.user.id,
      newValue: rows[0],
    });

    res.status(201).json({ spouse: rows[0] });
  } catch (err) {
    console.error('Add spouse error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// PUT /api/trees/:treeId/spouses/:id — update spouse relationship
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { marriage_date, divorce_date, marriage_order, status } = req.body;

  try {
    const { rows: oldRows } = await pool.query(
      'SELECT * FROM spouses WHERE id = $1', [id]
    );
    if (oldRows.length === 0) {
      return res.status(404).json({ error: 'العلاقة غير موجودة' });
    }

    const { rows } = await pool.query(
      `UPDATE spouses SET
        marriage_date = COALESCE($1, marriage_date),
        divorce_date = $2,
        marriage_order = COALESCE($3, marriage_order),
        status = COALESCE($4, status)
       WHERE id = $5
       RETURNING *`,
      [marriage_date, divorce_date !== undefined ? divorce_date : oldRows[0].divorce_date,
       marriage_order, status, id]
    );

    await logAudit({
      familyTreeId: null,
      action: 'edit',
      entityType: 'spouse',
      entityId: id,
      changedBy: req.user.id,
      oldValue: oldRows[0],
      newValue: rows[0],
    });

    res.json({ spouse: rows[0] });
  } catch (err) {
    console.error('Update spouse error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/trees/:treeId/spouses/:id — remove spouse relationship
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: oldRows } = await pool.query(
      'SELECT * FROM spouses WHERE id = $1', [id]
    );
    if (oldRows.length === 0) {
      return res.status(404).json({ error: 'العلاقة غير موجودة' });
    }

    await pool.query('DELETE FROM spouses WHERE id = $1', [id]);

    await logAudit({
      familyTreeId: null,
      action: 'delete',
      entityType: 'spouse',
      entityId: id,
      changedBy: req.user.id,
      oldValue: oldRows[0],
    });

    res.json({ message: 'تم حذف العلاقة بنجاح' });
  } catch (err) {
    console.error('Delete spouse error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
