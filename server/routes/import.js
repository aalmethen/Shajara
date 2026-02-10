const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { requireTreeAdmin } = require('../middleware/treeAccess');
const { logAudit } = require('../utils/auditLog');
const { getTreeGraph } = require('../utils/graphTraversal');

const router = express.Router({ mergeParams: true });

/**
 * Resolve a name to a person UUID.
 * Prefers exact match on first_name + family_name, falls back to first_name only.
 * Filters by expected gender if provided.
 */
function resolveName(name, lookupMap, expectedGender) {
  if (!name || !name.trim()) return { id: null, warning: null };

  const trimmed = name.trim();
  const candidates = lookupMap.get(trimmed) || [];

  if (candidates.length === 0) {
    return { id: null, warning: `الاسم "${trimmed}" غير موجود في الشجرة` };
  }

  // Filter by gender if specified
  let filtered = expectedGender
    ? candidates.filter(c => c.gender === expectedGender)
    : candidates;

  if (filtered.length === 0) filtered = candidates; // fallback to all

  if (filtered.length === 1) {
    return { id: filtered[0].id, warning: null };
  }

  // Multiple matches — return first and warn
  return {
    id: filtered[0].id,
    warning: `الاسم "${trimmed}" غير فريد (${filtered.length} تطابق) — تم اختيار أول تطابق`,
  };
}

/**
 * Build a lookup map: name -> [{ id, gender, first_name, family_name }]
 * Keys by: first_name, and first_name + family_name (space-separated)
 */
function buildLookupMap(persons) {
  const map = new Map();

  for (const p of persons) {
    const firstName = p.first_name?.trim();
    const fullName = p.family_name
      ? `${firstName} ${p.family_name.trim()}`
      : null;

    // Index by first name
    if (firstName) {
      if (!map.has(firstName)) map.set(firstName, []);
      map.get(firstName).push(p);
    }

    // Index by full name
    if (fullName && fullName !== firstName) {
      if (!map.has(fullName)) map.set(fullName, []);
      map.get(fullName).push(p);
    }
  }

  return map;
}

/**
 * Topological sort: persons with no parent refs first, then children
 */
function topologicalSort(persons) {
  // Group by whether they reference other persons in the import batch
  const nameSet = new Set(persons.map(p => p.first_name?.trim()).filter(Boolean));

  const noParents = [];
  const withParents = [];

  for (const p of persons) {
    const hasFatherInBatch = p.father_name && nameSet.has(p.father_name.trim());
    const hasMotherInBatch = p.mother_name && nameSet.has(p.mother_name.trim());

    if (!hasFatherInBatch && !hasMotherInBatch) {
      noParents.push(p);
    } else {
      withParents.push(p);
    }
  }

  // Simple two-pass: insert no-parent persons first, then the rest
  // For deeper hierarchies, we'd need a full topo-sort, but two passes covers most cases
  return [...noParents, ...withParents];
}

// POST /api/trees/:treeId/import
router.post('/', requireAuth, requireTreeAdmin, async (req, res) => {
  const { treeId } = req.params;
  const { persons: importPersons = [], spouses: importSpouses = [] } = req.body;

  if (!Array.isArray(importPersons) || importPersons.length === 0) {
    return res.status(400).json({ error: 'لا توجد بيانات أشخاص للاستيراد' });
  }

  const client = await pool.connect();
  const warnings = [];
  let personsImported = 0;
  let spousesImported = 0;

  try {
    await client.query('BEGIN');

    // Load existing persons reachable from this tree (for name resolution)
    const { rows: treeRow } = await client.query(
      'SELECT root_person_id, traversal_mode, depth_limit FROM family_trees WHERE id = $1',
      [treeId]
    );

    let existingPersons = [];
    if (treeRow.length > 0 && treeRow[0].root_person_id) {
      const graph = await getTreeGraph(
        treeRow[0].root_person_id,
        treeRow[0].traversal_mode || 'descendants',
        treeRow[0].depth_limit || 20
      );
      existingPersons = graph.persons;
    }

    // Build lookup map from existing persons
    const lookupMap = buildLookupMap(existingPersons);

    // Sort import list: parents before children
    const sorted = topologicalSort(importPersons);

    // First pass: insert persons
    for (const p of sorted) {
      // Validate required fields
      if (!p.first_name || !p.gender) {
        warnings.push(`تم تخطي صف بدون اسم أو جنس: ${JSON.stringify(p)}`);
        continue;
      }

      // Normalize gender
      let gender = p.gender;
      if (gender === 'ذكر') gender = 'male';
      if (gender === 'أنثى') gender = 'female';
      if (gender !== 'male' && gender !== 'female') {
        warnings.push(`جنس غير صالح "${p.gender}" للشخص "${p.first_name}" — تم تخطيه`);
        continue;
      }

      // Normalize status
      let status = p.status || 'alive';
      if (status === 'حي') status = 'alive';
      if (status === 'متوفى') status = 'deceased';
      if (status !== 'alive' && status !== 'deceased') status = 'alive';

      // Resolve parent names to IDs
      let fatherId = p.father_id || null;
      let motherId = p.mother_id || null;

      if (!fatherId && p.father_name) {
        const result = resolveName(p.father_name, lookupMap, 'male');
        fatherId = result.id;
        if (result.warning) warnings.push(result.warning);
      }

      if (!motherId && p.mother_name) {
        const result = resolveName(p.mother_name, lookupMap, 'female');
        motherId = result.id;
        if (result.warning) warnings.push(result.warning);
      }

      // Insert person with home_tree_id (no family_tree_id)
      const { rows } = await client.query(
        `INSERT INTO persons (first_name, family_name, gender, father_id, mother_id, birth_date, death_date, status, bio, home_tree_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          p.first_name.trim(),
          p.family_name?.trim() || null,
          gender,
          fatherId,
          motherId,
          p.birth_date || null,
          p.death_date || null,
          status,
          p.bio || null,
          treeId,
          req.user.id,
        ]
      );

      const inserted = rows[0];
      personsImported++;

      // If tree has no root and this person has no father, set as root
      if (treeRow.length > 0 && !treeRow[0].root_person_id && !fatherId) {
        await client.query(
          'UPDATE family_trees SET root_person_id = $1 WHERE id = $2 AND root_person_id IS NULL',
          [inserted.id, treeId]
        );
        treeRow[0].root_person_id = inserted.id;
      }

      // Add to lookup map for subsequent parent resolution
      const firstName = inserted.first_name.trim();
      if (!lookupMap.has(firstName)) lookupMap.set(firstName, []);
      lookupMap.get(firstName).push(inserted);

      if (inserted.family_name) {
        const fullName = `${firstName} ${inserted.family_name.trim()}`;
        if (!lookupMap.has(fullName)) lookupMap.set(fullName, []);
        lookupMap.get(fullName).push(inserted);
      }

      await logAudit({
        familyTreeId: treeId,
        action: 'add',
        entityType: 'person',
        entityId: inserted.id,
        changedBy: req.user.id,
        newValue: inserted,
      });
    }

    // Second pass: insert spouse relationships
    for (const s of importSpouses) {
      let personAId = s.person_a_id || null;
      let personBId = s.person_b_id || null;

      if (!personAId && s.person_a_name) {
        const result = resolveName(s.person_a_name, lookupMap, null);
        personAId = result.id;
        if (result.warning) warnings.push(result.warning);
      }

      if (!personBId && s.person_b_name) {
        const result = resolveName(s.person_b_name, lookupMap, null);
        personBId = result.id;
        if (result.warning) warnings.push(result.warning);
      }

      if (!personAId || !personBId) {
        warnings.push(`تم تخطي علاقة زواج: لم يتم العثور على أحد الزوجين (${s.person_a_name || s.person_a_id} - ${s.person_b_name || s.person_b_id})`);
        continue;
      }

      // Normalize status
      let status = s.status || 'married';
      if (status === 'متزوج' || status === 'متزوجان') status = 'married';
      if (status === 'مطلق' || status === 'مطلقان') status = 'divorced';
      if (status === 'أرمل' || status === 'أرملة') status = 'widowed';

      await client.query(
        `INSERT INTO spouses (person_a_id, person_b_id, marriage_date, divorce_date, marriage_order, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          personAId,
          personBId,
          s.marriage_date || null,
          s.divorce_date || null,
          s.marriage_order || 1,
          status,
          req.user.id,
        ]
      );

      spousesImported++;
    }

    await client.query('COMMIT');

    res.json({
      imported: { persons: personsImported, spouses: spousesImported },
      warnings,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import error:', err);
    res.status(500).json({ error: 'خطأ في استيراد البيانات: ' + (err.message || '') });
  } finally {
    client.release();
  }
});

module.exports = router;
