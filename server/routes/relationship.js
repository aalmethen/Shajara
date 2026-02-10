const express = require('express');
const pool = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');
const { findRelationship } = require('../utils/relationship');
const { getTreeGraph } = require('../utils/graphTraversal');

const router = express.Router({ mergeParams: true });

// GET /api/trees/:treeId/relationship?from=UUID&to=UUID
router.get('/', optionalAuth, async (req, res) => {
  const { treeId } = req.params;
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'يجب تحديد شخصين (from و to)' });
  }

  try {
    // Validate tree exists and get its config
    const { rows: trees } = await pool.query(
      'SELECT id, root_person_id, traversal_mode, depth_limit FROM family_trees WHERE id = $1', [treeId]
    );
    if (trees.length === 0) {
      return res.status(404).json({ error: 'الشجرة غير موجودة' });
    }

    const tree = trees[0];

    // Use graph traversal to get persons and spouses for this tree
    const graph = await getTreeGraph(
      tree.root_person_id,
      tree.traversal_mode || 'descendants',
      tree.depth_limit || 20
    );

    // Find relationship within the tree's graph
    const result = findRelationship(graph.persons, graph.spouses, from, to);

    if (!result) {
      return res.status(404).json({ error: 'لم يتم العثور على أحد الشخصين' });
    }

    res.json({ relationship: result });
  } catch (err) {
    console.error('Relationship error:', err);
    res.status(500).json({ error: 'خطأ في البحث عن العلاقة' });
  }
});

module.exports = router;
