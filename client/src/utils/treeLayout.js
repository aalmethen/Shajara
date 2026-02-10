import * as d3 from 'd3';

/**
 * Build a D3 hierarchy from flat person data
 *
 * @param {Array} persons - All persons in the tree
 * @param {Array} spouses - All spouse relationships
 * @param {string} rootId - Root person ID
 * @param {string} mode - 'male' for male lineage, 'full' for all
 * @returns {Object} D3 hierarchy root node
 */
export function buildHierarchy(persons, spouses, rootId, mode = 'male', maxDepth = 30, collapsedNodes = new Set()) {
  if (!persons.length) return null;

  const personMap = new Map(persons.map(p => [p.id, { ...p }]));
  const spouseMap = buildSpouseMap(spouses, personMap);

  // Find root person
  let root = personMap.get(rootId);
  if (!root) {
    // Fallback: find person with no father_id
    root = persons.find(p => !p.father_id) || persons[0];
    root = { ...root };
  }

  // Build tree recursively
  const visited = new Set();
  const tree = buildNode(root, personMap, spouseMap, mode, visited, 0, maxDepth, collapsedNodes);

  if (!tree) return null;

  // Convert to D3 hierarchy
  const hierarchy = d3.hierarchy(tree, d => d.children);

  // Apply tree layout
  const treeLayout = d3.tree()
    .nodeSize([220, 180])
    .separation((a, b) => {
      // More separation for nodes with spouses
      const aSpouses = a.data.spouses?.length || 0;
      const bSpouses = b.data.spouses?.length || 0;
      const base = a.parent === b.parent ? 1 : 1.2;
      return base + (aSpouses + bSpouses) * 0.3;
    });

  treeLayout(hierarchy);

  return hierarchy;
}

/**
 * Build spouse lookup map
 */
function buildSpouseMap(spouses, personMap) {
  const map = new Map(); // personId -> [{spouse, relationship}]

  for (const s of spouses) {
    const spouseA = personMap.get(s.person_a_id);
    const spouseB = personMap.get(s.person_b_id);

    if (spouseA && spouseB) {
      if (!map.has(s.person_a_id)) map.set(s.person_a_id, []);
      if (!map.has(s.person_b_id)) map.set(s.person_b_id, []);

      map.get(s.person_a_id).push({
        spouse: spouseB,
        relationship: s,
      });
      map.get(s.person_b_id).push({
        spouse: spouseA,
        relationship: s,
      });
    }
  }

  return map;
}

/**
 * Recursively build a tree node with children
 */
function buildNode(person, personMap, spouseMap, mode, visited, depth, maxDepth = 30, collapsedNodes = new Set()) {
  if (!person || visited.has(person.id)) return null;
  if (depth > maxDepth) return null; // Depth limit

  visited.add(person.id);

  const spouses = (spouseMap.get(person.id) || [])
    .sort((a, b) => (a.relationship.marriage_order || 1) - (b.relationship.marriage_order || 1));

  // Find children
  let children = [];
  const allPersons = Array.from(personMap.values());

  if (mode === 'male') {
    // Male lineage: only expand children of males
    // Exception: if a woman is explicitly the root (depth 0), still show her children
    if (person.gender === 'male') {
      children = allPersons.filter(p => p.father_id === person.id);
    } else if (depth === 0) {
      // Female root override: show children where she is mother
      children = allPersons.filter(p => p.mother_id === person.id);
    }
    // Otherwise women are leaf nodes in male lineage mode
  } else {
    // Full mode: children where this person is father OR mother
    children = allPersons.filter(p =>
      p.father_id === person.id || p.mother_id === person.id
    );
  }

  const hasChildren = children.length > 0;

  // If node is collapsed, don't expand children
  if (collapsedNodes.has(person.id) && hasChildren) {
    return {
      id: person.id,
      person,
      spouses,
      childrenGroups: groupChildrenByOtherParent(person, children, personMap),
      children: undefined,
      _hasChildren: true,
      _collapsed: true,
      depth,
    };
  }

  // Group children by the other parent
  const childrenGroups = groupChildrenByOtherParent(person, children, personMap);

  // Recursively build child nodes
  const childNodes = [];
  for (const child of children) {
    const childNode = buildNode(child, personMap, spouseMap, mode, visited, depth + 1, maxDepth, collapsedNodes);
    if (childNode) {
      childNodes.push(childNode);
    }
  }

  return {
    id: person.id,
    person,
    spouses,
    childrenGroups,
    children: childNodes.length > 0 ? childNodes : undefined,
    _hasChildren: hasChildren,
    _collapsed: false,
    depth,
  };
}

/**
 * Group children by the other parent
 * For a male: group by mother_id
 * For a female: group by father_id
 */
function groupChildrenByOtherParent(person, children, personMap) {
  const groups = new Map(); // otherParentId -> { parent, children }

  for (const child of children) {
    const otherParentId = person.gender === 'male' ? child.mother_id : child.father_id;
    const key = otherParentId || 'unknown';

    if (!groups.has(key)) {
      const otherParent = otherParentId ? personMap.get(otherParentId) : null;
      groups.set(key, {
        parentId: otherParentId,
        parentName: otherParent?.first_name || 'غير معروف',
        children: [],
      });
    }

    groups.get(key).children.push(child);
  }

  return Array.from(groups.values());
}

/**
 * Calculate the bounding box of a hierarchy for fit-to-screen
 */
export function getTreeBounds(hierarchy) {
  if (!hierarchy) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  hierarchy.each(node => {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  });

  return {
    minX, maxX, minY, maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate zoom transform to fit the tree in a container
 */
export function fitToScreen(hierarchy, containerWidth, containerHeight) {
  const bounds = getTreeBounds(hierarchy);

  const padding = 100;
  const treeWidth = bounds.width + padding * 2;
  const treeHeight = bounds.height + padding * 2;

  const scale = Math.min(
    containerWidth / treeWidth,
    containerHeight / treeHeight,
    1.5 // max scale
  );

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const translateX = containerWidth / 2 - centerX * scale;
  const translateY = containerHeight / 2 - centerY * scale;

  return d3.zoomIdentity.translate(translateX, translateY).scale(scale);
}
