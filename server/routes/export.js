const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { requireTreeAdmin } = require('../middleware/treeAccess');
const { getTreeGraph } = require('../utils/graphTraversal');

const router = express.Router({ mergeParams: true });

/**
 * Escape a CSV field — double-quote if it contains commas, quotes, or newlines
 */
function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// GET /api/trees/:treeId/export?format=json|csv
router.get('/', requireAuth, requireTreeAdmin, async (req, res) => {
  const { treeId } = req.params;
  const format = req.query.format || 'json';

  try {
    // Fetch tree metadata
    const { rows: trees } = await pool.query(
      'SELECT * FROM family_trees WHERE id = $1', [treeId]
    );
    if (trees.length === 0) {
      return res.status(404).json({ error: 'الشجرة غير موجودة' });
    }
    const tree = trees[0];

    // Use graph traversal to get persons and spouses for this tree view
    const graph = await getTreeGraph(
      tree.root_person_id,
      tree.traversal_mode || 'descendants',
      tree.depth_limit || 20
    );

    const persons = graph.persons;
    const spouses = graph.spouses;

    // Build person map for name resolution
    const personMap = new Map(persons.map(p => [p.id, p]));

    if (format === 'csv') {
      // CSV export — persons only
      const headers = [
        'id', 'first_name', 'family_name', 'gender',
        'father_id', 'father_name', 'mother_id', 'mother_name',
        'birth_date', 'death_date', 'status', 'bio'
      ];

      const rows = persons.map(p => {
        const father = p.father_id ? personMap.get(p.father_id) : null;
        const mother = p.mother_id ? personMap.get(p.mother_id) : null;
        return [
          p.id,
          p.first_name,
          p.family_name || '',
          p.gender,
          p.father_id || '',
          father ? `${father.first_name} ${father.family_name || ''}`.trim() : '',
          p.mother_id || '',
          mother ? `${mother.first_name} ${mother.family_name || ''}`.trim() : '',
          p.birth_date || '',
          p.death_date || '',
          p.status || 'alive',
          p.bio || '',
        ].map(csvEscape).join(',');
      });

      // UTF-8 BOM for Excel Arabic support
      const bom = '\uFEFF';
      const csv = bom + headers.join(',') + '\n' + rows.join('\n');

      const filename = `shajara-${tree.name}-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(csv);

    } else {
      // JSON export — full data
      const exportData = {
        meta: {
          tree_name: tree.name,
          exported_at: new Date().toISOString(),
          version: '1.0',
          person_count: persons.length,
          spouse_count: spouses.length,
        },
        tree: {
          id: tree.id,
          name: tree.name,
          description: tree.description,
          slug: tree.slug,
          root_person_id: tree.root_person_id,
          traversal_mode: tree.traversal_mode,
          depth_limit: tree.depth_limit,
        },
        persons: persons.map(p => {
          const father = p.father_id ? personMap.get(p.father_id) : null;
          const mother = p.mother_id ? personMap.get(p.mother_id) : null;
          return {
            ...p,
            _father_name: father ? `${father.first_name} ${father.family_name || ''}`.trim() : null,
            _mother_name: mother ? `${mother.first_name} ${mother.family_name || ''}`.trim() : null,
          };
        }),
        spouses: spouses.map(s => {
          const personA = personMap.get(s.person_a_id);
          const personB = personMap.get(s.person_b_id);
          return {
            ...s,
            _person_a_name: personA ? `${personA.first_name} ${personA.family_name || ''}`.trim() : null,
            _person_b_name: personB ? `${personB.first_name} ${personB.family_name || ''}`.trim() : null,
          };
        }),
      };

      const filename = `shajara-${tree.name}-${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.json(exportData);
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'خطأ في تصدير البيانات' });
  }
});

module.exports = router;
