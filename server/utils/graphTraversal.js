const pool = require('../db/pool');

/**
 * Get all persons and spouses reachable from a tree's root person
 * using the PostgreSQL graph traversal function.
 *
 * @param {string} rootPersonId - UUID of the root person
 * @param {string} mode - 'descendants', 'ancestors', or 'both'
 * @param {number} depthLimit - Maximum traversal depth
 * @returns {{ persons: Array, spouses: Array, hasMore: boolean }}
 */
async function getTreeGraph(rootPersonId, mode = 'descendants', depthLimit = 20) {
  if (!rootPersonId) {
    return { persons: [], spouses: [], hasMore: false };
  }

  // Get all reachable person IDs (including spouses) via PG function
  const { rows: reachable } = await pool.query(
    `SELECT person_id, depth FROM get_tree_person_ids_with_spouses($1, $2, $3)`,
    [rootPersonId, mode, depthLimit]
  );

  if (reachable.length === 0) {
    return { persons: [], spouses: [], hasMore: false };
  }

  const personIds = reachable.map(r => r.person_id);
  const maxDepthReached = Math.max(...reachable.map(r => r.depth));

  // Fetch full person objects with father's first name
  const { rows: persons } = await pool.query(
    `SELECT p.*, f.first_name as father_first_name
     FROM persons p
     LEFT JOIN persons f ON p.father_id = f.id
     WHERE p.id = ANY($1)
     ORDER BY p.created_at`,
    [personIds]
  );

  // Fetch spouses where BOTH persons are in the reachable set
  const { rows: spouses } = await pool.query(
    `SELECT * FROM spouses
     WHERE person_a_id = ANY($1) AND person_b_id = ANY($1)
     ORDER BY marriage_order`,
    [personIds]
  );

  // Check if there are more persons beyond the depth limit
  let hasMore = false;
  if (maxDepthReached >= depthLimit) {
    // Check if any person at max depth has children
    const { rows: deeper } = await pool.query(
      `SELECT 1 FROM persons
       WHERE (father_id = ANY($1) OR mother_id = ANY($1))
         AND NOT (id = ANY($1))
       LIMIT 1`,
      [personIds]
    );
    hasMore = deeper.length > 0;
  }

  return { persons, spouses, hasMore };
}

/**
 * Check if a specific person is reachable from a tree root.
 *
 * @param {string} personId - UUID of the person to check
 * @param {string} rootPersonId - UUID of the tree root
 * @param {string} mode - Traversal mode
 * @param {number} depthLimit - Maximum depth
 * @returns {boolean}
 */
async function isPersonReachable(personId, rootPersonId, mode = 'descendants', depthLimit = 20) {
  if (!personId || !rootPersonId) return false;
  if (personId === rootPersonId) return true;

  const { rows } = await pool.query(
    `SELECT 1 FROM get_tree_person_ids_with_spouses($1, $2, $3) WHERE person_id = $4 LIMIT 1`,
    [rootPersonId, mode, depthLimit, personId]
  );

  return rows.length > 0;
}

/**
 * Get all trees where a person is reachable.
 * Used for access control decisions.
 *
 * @param {string} personId - UUID of the person
 * @returns {Array<{ treeId, treeName, role }>}
 */
async function getPersonTrees(personId) {
  if (!personId) return [];

  const { rows: trees } = await pool.query(
    `SELECT id, name, slug, root_person_id, traversal_mode, depth_limit
     FROM family_trees
     WHERE root_person_id IS NOT NULL`
  );

  const reachableTrees = [];
  for (const tree of trees) {
    const reachable = await isPersonReachable(
      personId,
      tree.root_person_id,
      tree.traversal_mode || 'descendants',
      tree.depth_limit || 20
    );
    if (reachable) {
      reachableTrees.push({
        treeId: tree.id,
        treeName: tree.name,
        slug: tree.slug,
      });
    }
  }

  return reachableTrees;
}

/**
 * Check if a user can edit a specific person.
 * A user can edit if:
 * 1. User is the person's creator (created_by), OR
 * 2. User is admin of the person's home_tree_id, OR
 * 3. User is admin of ANY tree that can reach this person
 *
 * @param {string} userId - UUID of the user
 * @param {string} personId - UUID of the person
 * @returns {boolean}
 */
async function canUserEditPerson(userId, personId) {
  if (!userId || !personId) return false;

  // Check 1: Is user the creator?
  const { rows: personRows } = await pool.query(
    `SELECT created_by, home_tree_id FROM persons WHERE id = $1`,
    [personId]
  );

  if (personRows.length === 0) return false;
  const person = personRows[0];

  if (person.created_by === userId) return true;

  // Check 2: Is user admin of the home tree?
  if (person.home_tree_id) {
    const { rows: homeAdmin } = await pool.query(
      `SELECT 1 FROM tree_members WHERE user_id = $1 AND family_tree_id = $2 AND role = 'admin'`,
      [userId, person.home_tree_id]
    );
    if (homeAdmin.length > 0) return true;
  }

  // Check 3: Is user admin of ANY tree that can reach this person?
  const { rows: adminTrees } = await pool.query(
    `SELECT ft.id, ft.root_person_id, ft.traversal_mode, ft.depth_limit
     FROM tree_members tm
     JOIN family_trees ft ON ft.id = tm.family_tree_id
     WHERE tm.user_id = $1 AND tm.role = 'admin' AND ft.root_person_id IS NOT NULL`,
    [userId]
  );

  for (const tree of adminTrees) {
    const reachable = await isPersonReachable(
      personId,
      tree.root_person_id,
      tree.traversal_mode || 'descendants',
      tree.depth_limit || 20
    );
    if (reachable) return true;
  }

  return false;
}

module.exports = {
  getTreeGraph,
  isPersonReachable,
  getPersonTrees,
  canUserEditPerson,
};
