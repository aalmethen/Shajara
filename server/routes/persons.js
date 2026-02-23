const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireTreeAdmin, requirePersonEditAccess } = require('../middleware/treeAccess');
const { logAudit } = require('../utils/auditLog');

const router = express.Router({ mergeParams: true });

// POST /api/trees/:treeId/persons — add a person (global, with home_tree_id)
router.post('/', requireAuth, requireTreeAdmin, [
  body('first_name').notEmpty().withMessage('الاسم الأول مطلوب'),
  body('gender').isIn(['male', 'female']).withMessage('الجنس مطلوب'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { treeId } = req.params;
  const {
    first_name, family_name, gender, father_id, mother_id,
    birth_date, death_date, status, bio
  } = req.body;

  try {
    // Validate father_id exists globally
    if (father_id) {
      const { rows } = await pool.query('SELECT id FROM persons WHERE id = $1', [father_id]);
      if (rows.length === 0) {
        return res.status(400).json({ error: 'الأب غير موجود' });
      }
    }

    // Validate mother_id exists globally
    if (mother_id) {
      const { rows } = await pool.query('SELECT id FROM persons WHERE id = $1', [mother_id]);
      if (rows.length === 0) {
        return res.status(400).json({ error: 'الأم غير موجودة' });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO persons (first_name, family_name, gender, father_id, mother_id, birth_date, death_date, status, bio, home_tree_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [first_name, family_name || null, gender, father_id || null, mother_id || null,
       birth_date || null, death_date || null, status || 'alive', bio || null,
       treeId, req.user.id]
    );

    const person = rows[0];

    // If tree has no root_person_id and this person has no father, set as root
    if (!father_id) {
      const { rows: treeRows } = await pool.query(
        'SELECT root_person_id FROM family_trees WHERE id = $1', [treeId]
      );
      if (treeRows.length > 0 && !treeRows[0].root_person_id) {
        await pool.query(
          'UPDATE family_trees SET root_person_id = $1 WHERE id = $2',
          [person.id, treeId]
        );
      }
    }

    await logAudit({
      familyTreeId: treeId,
      action: 'add',
      entityType: 'person',
      entityId: person.id,
      changedBy: req.user.id,
      newValue: person,
    });

    res.status(201).json({ person });
  } catch (err) {
    console.error('Add person error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/trees/:treeId/persons — list persons reachable from tree
router.get('/', optionalAuth, async (req, res) => {
  const { treeId } = req.params;

  try {
    const { rows: treeRows } = await pool.query(
      'SELECT root_person_id, traversal_mode, depth_limit FROM family_trees WHERE id = $1',
      [treeId]
    );
    if (treeRows.length === 0) {
      return res.status(404).json({ error: 'الشجرة غير موجودة' });
    }

    const tree = treeRows[0];
    if (!tree.root_person_id) {
      return res.json({ persons: [] });
    }

    const { rows: persons } = await pool.query(
      `SELECT p.*,
        (SELECT json_agg(s.*) FROM spouses s
         WHERE s.person_a_id = p.id OR s.person_b_id = p.id) as spouse_relations
       FROM persons p
       WHERE p.id IN (SELECT person_id FROM get_tree_person_ids_with_spouses($1, $2, $3))
       ORDER BY p.created_at`,
      [tree.root_person_id, tree.traversal_mode || 'descendants', tree.depth_limit || 20]
    );

    res.json({ persons });
  } catch (err) {
    console.error('List persons error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/trees/:treeId/persons/:id — get person detail (global)
router.get('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query('SELECT * FROM persons WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'الشخص غير موجود' });
    }

    const person = rows[0];

    // Get spouses
    const { rows: spouses } = await pool.query(
      `SELECT s.*,
        CASE WHEN s.person_a_id = $1 THEN s.person_b_id ELSE s.person_a_id END as spouse_id
       FROM spouses s
       WHERE (s.person_a_id = $1 OR s.person_b_id = $1)
       ORDER BY s.marriage_order`,
      [id]
    );

    const spouseDetails = [];
    for (const s of spouses) {
      const { rows: spPersonRows } = await pool.query(
        'SELECT id, first_name, family_name, gender FROM persons WHERE id = $1',
        [s.spouse_id]
      );
      if (spPersonRows.length > 0) {
        spouseDetails.push({ ...s, spouse: spPersonRows[0] });
      }
    }

    // Get children (globally)
    const { rows: children } = await pool.query(
      'SELECT * FROM persons WHERE father_id = $1 OR mother_id = $1 ORDER BY birth_date',
      [id]
    );

    // Get father and mother
    let father = null, mother = null;
    if (person.father_id) {
      const { rows: fRows } = await pool.query(
        'SELECT id, first_name, family_name, gender FROM persons WHERE id = $1', [person.father_id]
      );
      father = fRows[0] || null;
    }
    if (person.mother_id) {
      const { rows: mRows } = await pool.query(
        'SELECT id, first_name, family_name, gender FROM persons WHERE id = $1', [person.mother_id]
      );
      mother = mRows[0] || null;
    }

    res.json({ person, spouses: spouseDetails, children, father, mother });
  } catch (err) {
    console.error('Get person error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// PUT /api/trees/:treeId/persons/:id — update person (global, edit access check)
router.put('/:id', requireAuth, requirePersonEditAccess, async (req, res) => {
  const { id } = req.params;
  const {
    first_name, family_name, gender, father_id, mother_id,
    birth_date, death_date, status, bio
  } = req.body;

  try {
    const { rows: oldRows } = await pool.query('SELECT * FROM persons WHERE id = $1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ error: 'الشخص غير موجود' });
    }

    const { rows } = await pool.query(
      `UPDATE persons SET
        first_name = COALESCE($1, first_name),
        family_name = COALESCE($2, family_name),
        gender = COALESCE($3, gender),
        father_id = $4,
        mother_id = $5,
        birth_date = $6,
        death_date = $7,
        status = COALESCE($8, status),
        bio = $9,
        updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [first_name, family_name, gender,
       father_id !== undefined ? father_id : oldRows[0].father_id,
       mother_id !== undefined ? mother_id : oldRows[0].mother_id,
       birth_date !== undefined ? birth_date : oldRows[0].birth_date,
       death_date !== undefined ? death_date : oldRows[0].death_date,
       status,
       bio !== undefined ? bio : oldRows[0].bio,
       id]
    );

    // If this person is the root of the tree and now has a father, update root to the father
    const updatedPerson = rows[0];
    let newRootId = null;
    if (updatedPerson.father_id && !oldRows[0].father_id) {
      const { treeId } = req.params;
      const { rows: treeRows } = await pool.query(
        'SELECT id FROM family_trees WHERE id = $1 AND root_person_id = $2',
        [treeId, id]
      );
      if (treeRows.length > 0) {
        await pool.query(
          'UPDATE family_trees SET root_person_id = $1 WHERE id = $2',
          [updatedPerson.father_id, treeId]
        );
        newRootId = updatedPerson.father_id;
      }
    }

    await logAudit({
      familyTreeId: oldRows[0].home_tree_id,
      action: 'edit',
      entityType: 'person',
      entityId: id,
      changedBy: req.user.id,
      oldValue: oldRows[0],
      newValue: updatedPerson,
    });

    res.json({ person: updatedPerson, newRootId });
  } catch (err) {
    console.error('Update person error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/trees/:treeId/persons/:id — delete person (global, edit access check)
router.delete('/:id', requireAuth, requirePersonEditAccess, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: oldRows } = await pool.query('SELECT * FROM persons WHERE id = $1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ error: 'الشخص غير موجود' });
    }

    // Clear root_person_id if this person is root of any tree
    await pool.query('UPDATE family_trees SET root_person_id = NULL WHERE root_person_id = $1', [id]);

    // Set null on children's references
    await pool.query('UPDATE persons SET father_id = NULL WHERE father_id = $1', [id]);
    await pool.query('UPDATE persons SET mother_id = NULL WHERE mother_id = $1', [id]);

    // Delete person (cascades to spouses)
    await pool.query('DELETE FROM persons WHERE id = $1', [id]);

    await logAudit({
      familyTreeId: oldRows[0].home_tree_id,
      action: 'delete',
      entityType: 'person',
      entityId: id,
      changedBy: req.user.id,
      oldValue: oldRows[0],
    });

    res.json({ message: 'تم حذف الشخص بنجاح' });
  } catch (err) {
    console.error('Delete person error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/trees/:treeId/persons/:id/ancestors — ancestor chain (global)
router.get('/:id/ancestors', optionalAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `WITH RECURSIVE ancestors AS (
        SELECT id, first_name, family_name, gender, father_id, mother_id, 0 as depth
        FROM persons WHERE id = $1
        UNION ALL
        SELECT p.id, p.first_name, p.family_name, p.gender, p.father_id, p.mother_id, a.depth + 1
        FROM persons p
        JOIN ancestors a ON a.father_id = p.id
      )
      SELECT * FROM ancestors ORDER BY depth`,
      [id]
    );

    res.json({ ancestors: rows });
  } catch (err) {
    console.error('Get ancestors error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/trees/:treeId/persons/:id/descendants — descendants (global)
router.get('/:id/descendants', optionalAuth, async (req, res) => {
  const { id } = req.params;
  const mode = req.query.mode || 'male';

  try {
    let query;
    if (mode === 'male') {
      query = `
        WITH RECURSIVE descendants AS (
          SELECT id, first_name, family_name, gender, father_id, mother_id, birth_date, death_date, status, bio, 0 as depth
          FROM persons WHERE id = $1
          UNION ALL
          SELECT p.id, p.first_name, p.family_name, p.gender, p.father_id, p.mother_id, p.birth_date, p.death_date, p.status, p.bio, d.depth + 1
          FROM persons p
          JOIN descendants d ON p.father_id = d.id AND d.gender = 'male'
        )
        SELECT * FROM descendants ORDER BY depth, first_name`;
    } else {
      query = `
        WITH RECURSIVE descendants AS (
          SELECT id, first_name, family_name, gender, father_id, mother_id, birth_date, death_date, status, bio, 0 as depth
          FROM persons WHERE id = $1
          UNION ALL
          SELECT p.id, p.first_name, p.family_name, p.gender, p.father_id, p.mother_id, p.birth_date, p.death_date, p.status, p.bio, d.depth + 1
          FROM persons p
          JOIN descendants d ON (p.father_id = d.id OR p.mother_id = d.id)
        )
        SELECT DISTINCT ON (id) * FROM descendants ORDER BY id, depth`;
    }

    const { rows } = await pool.query(query, [id]);
    res.json({ descendants: rows });
  } catch (err) {
    console.error('Get descendants error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/trees/:treeId/persons/:id/nasab — generate nasab (global)
router.get('/:id/nasab', optionalAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `WITH RECURSIVE ancestors AS (
        SELECT id, first_name, family_name, gender, father_id, 0 as depth
        FROM persons WHERE id = $1
        UNION ALL
        SELECT p.id, p.first_name, p.family_name, p.gender, p.father_id, a.depth + 1
        FROM persons p
        JOIN ancestors a ON a.father_id = p.id
      )
      SELECT * FROM ancestors ORDER BY depth`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'الشخص غير موجود' });
    }

    const person = rows[0];
    const connector = person.gender === 'male' ? 'بن' : 'بنت';
    const parts = [rows[0].first_name];
    for (let i = 1; i < rows.length; i++) {
      parts.push(i === 1 ? connector : 'بن');
      parts.push(rows[i].first_name);
    }

    const familyName = rows.find(r => r.family_name)?.family_name;
    if (familyName) parts.push(familyName);

    res.json({ nasab: parts.join(' '), ancestors: rows });
  } catch (err) {
    console.error('Get nasab error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
