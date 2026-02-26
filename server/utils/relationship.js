/**
 * Family relationship finder — BFS path-finding + Arabic labeling
 */

/**
 * Build an adjacency list graph from persons and spouses
 */
function buildFamilyGraph(persons, spouses) {
  const graph = new Map(); // personId -> [{ id, type, subtype }]

  for (const p of persons) {
    if (!graph.has(p.id)) graph.set(p.id, []);

    if (p.father_id && persons.some(x => x.id === p.father_id)) {
      graph.get(p.id).push({ id: p.father_id, type: 'parent', subtype: 'father' });
      if (!graph.has(p.father_id)) graph.set(p.father_id, []);
      graph.get(p.father_id).push({ id: p.id, type: 'child', subtype: p.gender === 'male' ? 'son' : 'daughter' });
    }

    if (p.mother_id && persons.some(x => x.id === p.mother_id)) {
      graph.get(p.id).push({ id: p.mother_id, type: 'parent', subtype: 'mother' });
      if (!graph.has(p.mother_id)) graph.set(p.mother_id, []);
      graph.get(p.mother_id).push({ id: p.id, type: 'child', subtype: p.gender === 'male' ? 'son' : 'daughter' });
    }
  }

  for (const s of spouses) {
    if (graph.has(s.person_a_id) && graph.has(s.person_b_id)) {
      graph.get(s.person_a_id).push({ id: s.person_b_id, type: 'spouse', subtype: 'spouse' });
      graph.get(s.person_b_id).push({ id: s.person_a_id, type: 'spouse', subtype: 'spouse' });
    }
  }

  return graph;
}

/**
 * BFS shortest path from fromId to toId
 * Returns array of { id, edge: { type, subtype } | null }
 */
function findPath(graph, fromId, toId) {
  if (fromId === toId) return [{ id: fromId, edge: null }];

  const visited = new Set([fromId]);
  const queue = [[{ id: fromId, edge: null }]];

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1].id;

    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      if (visited.has(neighbor.id)) continue;
      visited.add(neighbor.id);

      const newPath = [...path, {
        id: neighbor.id,
        edge: { type: neighbor.type, subtype: neighbor.subtype },
      }];

      if (neighbor.id === toId) return newPath;
      queue.push(newPath);
    }
  }

  return null; // no path found
}

/**
 * Get ancestor set for a person (through father_id chain)
 * Returns Map: ancestorId -> depth
 */
function getAncestorDepths(personId, personMap, maxDepth = 50) {
  const ancestors = new Map();
  ancestors.set(personId, 0);

  let current = personMap.get(personId);
  let depth = 0;

  while (current && depth < maxDepth) {
    if (current.father_id && personMap.has(current.father_id)) {
      depth++;
      ancestors.set(current.father_id, depth);
      current = personMap.get(current.father_id);
    } else {
      break;
    }
  }

  return ancestors;
}

/**
 * Get all ancestors (both father and mother lines) with depth
 * Returns Map: ancestorId -> { depth, via: 'father'|'mother' }
 */
function getAllAncestors(personId, personMap, maxDepth = 30) {
  const ancestors = new Map();
  const queue = [{ id: personId, depth: 0 }];
  ancestors.set(personId, { depth: 0, via: null });

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (depth >= maxDepth) continue;

    const person = personMap.get(id);
    if (!person) continue;

    if (person.father_id && personMap.has(person.father_id) && !ancestors.has(person.father_id)) {
      ancestors.set(person.father_id, { depth: depth + 1, via: 'father' });
      queue.push({ id: person.father_id, depth: depth + 1 });
    }

    if (person.mother_id && personMap.has(person.mother_id) && !ancestors.has(person.mother_id)) {
      ancestors.set(person.mother_id, { depth: depth + 1, via: 'mother' });
      queue.push({ id: person.mother_id, depth: depth + 1 });
    }
  }

  return ancestors;
}

/**
 * Find the Lowest Common Ancestor (LCA) between two persons
 * Returns { lcaId, depthA, depthB, viaA, viaB } or null
 */
function findLCA(personAId, personBId, personMap) {
  const ancestorsA = getAllAncestors(personAId, personMap);
  const ancestorsB = getAllAncestors(personBId, personMap);

  let bestLCA = null;
  let bestTotal = Infinity;

  for (const [id, infoA] of ancestorsA) {
    if (ancestorsB.has(id)) {
      const infoB = ancestorsB.get(id);
      const total = infoA.depth + infoB.depth;
      if (total < bestTotal) {
        bestTotal = total;
        bestLCA = {
          lcaId: id,
          depthA: infoA.depth,
          depthB: infoB.depth,
          viaA: infoA.via,
          viaB: infoB.via,
        };
      }
    }
  }

  return bestLCA;
}

/**
 * Check if the path from a person to the LCA goes through their father
 */
function pathGoesViaFather(personId, lcaId, personMap) {
  const person = personMap.get(personId);
  if (!person) return false;

  // Direct father
  if (person.father_id === lcaId) return true;
  if (person.mother_id === lcaId) return false;

  // Check father's ancestor chain
  const fatherAncestors = person.father_id ? getAllAncestors(person.father_id, personMap) : new Map();
  return fatherAncestors.has(lcaId);
}

/**
 * Label the relationship between two persons using the LCA approach
 * Returns { label, description, commonAncestor }
 */
function labelRelationship(personAId, personBId, personMap, lca) {
  const personA = personMap.get(personAId);
  const personB = personMap.get(personBId);

  if (!personA || !personB) {
    return { label: 'غير معروف', description: '' };
  }

  const { depthA, depthB, lcaId } = lca;
  const lcaPerson = personMap.get(lcaId);
  const bIsMale = personB.gender === 'male';

  // Same person
  if (personAId === personBId) {
    return { label: 'نفس الشخص', description: '' };
  }

  // Direct ancestor/descendant relationships
  if (depthA === 0) {
    // A is ancestor of B
    return labelDescendant(depthB, bIsMale, personA, personB, personMap);
  }

  if (depthB === 0) {
    // B is ancestor of A
    return labelAncestor(depthA, personA, personB, personMap);
  }

  // Siblings (share a parent)
  if (depthA === 1 && depthB === 1) {
    return labelSibling(personA, personB, lcaPerson, personMap);
  }

  // Uncle/Aunt (A is sibling of B's parent)
  // depthA=1: A is child of LCA, depthB=2: B is grandchild of LCA
  // A is uncle/aunt of B → label: "فلان عم فلان"
  if (depthA === 1 && depthB === 2) {
    const isViaFather = pathGoesViaFather(personBId, lcaId, personMap);
    const role = personA.gender === 'male'
      ? (isViaFather ? 'عم' : 'خال')
      : (isViaFather ? 'عمة' : 'خالة');
    return {
      label: `${personA.first_name} ${role} ${personB.first_name}`,
      description: `${personA.first_name} ${personA.gender === 'male' ? 'هو' : 'هي'} ${role} ${personB.first_name}`,
      commonAncestor: lcaPerson,
    };
  }

  // B is uncle/aunt of A
  // depthA=2: A is grandchild of LCA, depthB=1: B is child of LCA
  if (depthA === 2 && depthB === 1) {
    const isViaFather = pathGoesViaFather(personAId, lcaId, personMap);
    const role = bIsMale
      ? (isViaFather ? 'عم' : 'خال')
      : (isViaFather ? 'عمة' : 'خالة');
    return {
      label: `${personB.first_name} ${role} ${personA.first_name}`,
      description: `${personB.first_name} ${bIsMale ? 'هو' : 'هي'} ${role} ${personA.first_name}`,
      commonAncestor: lcaPerson,
    };
  }

  // Great uncle/aunt (A is sibling of B's grandparent or higher)
  // depthA=1: A is child of LCA, depthB>2: B is deeper descendant
  if (depthA === 1 && depthB > 2) {
    const isViaFather = pathGoesViaFather(personBId, lcaId, personMap);
    const aIsMale = personA.gender === 'male';
    const role = aIsMale
      ? (isViaFather ? 'عم' : 'خال')
      : (isViaFather ? 'عمة' : 'خالة');
    const gen = depthB - 2;
    const genLabel = gen === 1 ? 'أبو' : gen === 2 ? 'جد' : `جد ${'أبو '.repeat(gen - 2)}`.trim();
    return {
      label: `${personA.first_name} ${role} ${genLabel} ${personB.first_name}`,
      description: `${personA.first_name} ${aIsMale ? 'هو' : 'هي'} ${role} ${genLabel} ${personB.first_name}`,
      commonAncestor: lcaPerson,
    };
  }

  // B is great uncle/aunt of A (depthA>2, depthB=1)
  if (depthA > 2 && depthB === 1) {
    const isViaFather = pathGoesViaFather(personAId, lcaId, personMap);
    const role = bIsMale
      ? (isViaFather ? 'عم' : 'خال')
      : (isViaFather ? 'عمة' : 'خالة');
    const gen = depthA - 2;
    const genLabel = gen === 1 ? 'أبو' : gen === 2 ? 'جد' : `جد ${'أبو '.repeat(gen - 2)}`.trim();
    return {
      label: `${personB.first_name} ${role} ${genLabel} ${personA.first_name}`,
      description: `${personB.first_name} ${bIsMale ? 'هو' : 'هي'} ${role} ${genLabel} ${personA.first_name}`,
      commonAncestor: lcaPerson,
    };
  }

  // Cousins
  if (depthA === depthB) {
    return labelCousin(depthA, depthB, personA, personB, lcaPerson, personMap);
  }

  // Cousins with removal
  if (depthA >= 2 && depthB >= 2) {
    return labelCousin(depthA, depthB, personA, personB, lcaPerson, personMap);
  }

  // Generic fallback
  return {
    label: 'قريب',
    description: `${personA.first_name} و${personB.first_name} أقارب — يتشاركان ${lcaPerson ? lcaPerson.first_name : 'جد مشترك'}`,
    commonAncestor: lcaPerson,
  };
}

function labelDescendant(depth, bIsMale, personA, personB, personMap) {
  if (depth === 1) {
    return {
      label: bIsMale ? 'ابنه' : 'ابنته',
      description: `${personB.first_name} ${bIsMale ? 'ابن' : 'بنت'} ${personA.first_name}`,
    };
  }
  if (depth === 2) {
    return {
      label: bIsMale ? 'حفيده' : 'حفيدته',
      description: `${personB.first_name} ${bIsMale ? 'حفيد' : 'حفيدة'} ${personA.first_name}`,
    };
  }
  // Great-grandchild etc.
  const gen = depth - 2;
  const prefix = gen === 1 ? 'ابن الحفيد' : `${'ابن '.repeat(gen)}الحفيد`;
  return {
    label: bIsMale ? prefix : prefix.replace('ابن', 'بنت'),
    description: `${personB.first_name} من ذرية ${personA.first_name} (الجيل ${depth})`,
  };
}

function labelAncestor(depth, personA, personB, personMap) {
  const bIsMale = personB.gender === 'male';
  if (depth === 1) {
    return {
      label: bIsMale ? 'أبوه' : 'أمه',
      description: `${personB.first_name} ${bIsMale ? 'أب' : 'أم'} ${personA.first_name}`,
    };
  }
  if (depth === 2) {
    return {
      label: bIsMale ? 'جده' : 'جدته',
      description: `${personB.first_name} ${bIsMale ? 'جد' : 'جدة'} ${personA.first_name}`,
    };
  }
  // Great-grandparent
  const gen = depth - 2;
  const greatPrefix = 'الأكبر '.repeat(gen).trim();
  return {
    label: bIsMale ? `جده ${greatPrefix}` : `جدته ${greatPrefix}`.trim(),
    description: `${personB.first_name} ${bIsMale ? 'جد' : 'جدة'} ${personA.first_name} ${greatPrefix}`.trim(),
  };
}

function labelSibling(personA, personB, lcaPerson, personMap) {
  const bIsMale = personB.gender === 'male';

  // Check if they share both parents (full sibling) or only one (half sibling)
  const sharesFather = personA.father_id && personA.father_id === personB.father_id;
  const sharesMother = personA.mother_id && personA.mother_id === personB.mother_id;

  if (sharesFather && sharesMother) {
    return {
      label: bIsMale ? 'أخوه الشقيق' : 'أخته الشقيقة',
      description: `${personB.first_name} ${bIsMale ? 'أخ' : 'أخت'} ${personA.first_name} الشقيق`,
      commonAncestor: lcaPerson,
    };
  }

  if (sharesFather) {
    return {
      label: bIsMale ? 'أخوه من الأب' : 'أخته من الأب',
      description: `${personB.first_name} ${bIsMale ? 'أخ' : 'أخت'} ${personA.first_name} من الأب`,
      commonAncestor: lcaPerson,
    };
  }

  return {
    label: bIsMale ? 'أخوه من الأم' : 'أخته من الأم',
    description: `${personB.first_name} ${bIsMale ? 'أخ' : 'أخت'} ${personA.first_name} من الأم`,
    commonAncestor: lcaPerson,
  };
}

function labelCousin(depthA, depthB, personA, personB, lcaPerson, personMap) {
  const bIsMale = personB.gender === 'male';
  const minDepth = Math.min(depthA, depthB);
  const removal = Math.abs(depthA - depthB);

  // First cousins (both at depth 2 from LCA)
  if (minDepth === 2 && removal === 0) {
    // Determine if paternal or maternal
    const isViaFatherA = pathGoesViaFather(personA.id, lcaPerson?.id, personMap);

    if (isViaFatherA) {
      return {
        label: bIsMale ? 'ابن عمه' : 'بنت عمه',
        description: `${personA.first_name} و${personB.first_name} أبناء عمومة — يتشاركان الجد ${lcaPerson?.first_name || ''}`,
        commonAncestor: lcaPerson,
      };
    } else {
      return {
        label: bIsMale ? 'ابن خاله' : 'بنت خاله',
        description: `${personA.first_name} و${personB.first_name} أبناء خؤولة — يتشاركان الجد ${lcaPerson?.first_name || ''}`,
        commonAncestor: lcaPerson,
      };
    }
  }

  // Second cousins, third cousins, etc.
  if (removal === 0) {
    const degree = minDepth - 1;
    const ordinal = getArabicOrdinal(degree);
    return {
      label: `أبناء عمومة من الدرجة ${ordinal}`,
      description: `${personA.first_name} و${personB.first_name} أبناء عمومة من الدرجة ${ordinal} — يتشاركان الجد ${lcaPerson?.first_name || ''}`,
      commonAncestor: lcaPerson,
    };
  }

  // Cousins once/twice removed
  const degree = minDepth - 1;
  const ordinal = getArabicOrdinal(degree);
  const removedLabel = removal === 1 ? 'مرة واحدة' : `${removal} مرات`;

  return {
    label: `أبناء عمومة (درجة ${ordinal}، بفارق ${removedLabel})`,
    description: `${personA.first_name} و${personB.first_name} أبناء عمومة بفارق ${removedLabel} — يتشاركان الجد ${lcaPerson?.first_name || ''}`,
    commonAncestor: lcaPerson,
  };
}

function getArabicOrdinal(n) {
  const ordinals = {
    1: 'الأولى',
    2: 'الثانية',
    3: 'الثالثة',
    4: 'الرابعة',
    5: 'الخامسة',
    6: 'السادسة',
    7: 'السابعة',
    8: 'الثامنة',
    9: 'التاسعة',
    10: 'العاشرة',
  };
  return ordinals[n] || `${n}`;
}

/**
 * Main function: find the relationship between two persons
 * Returns { label, description, path, commonAncestor } or null
 */
function findRelationship(persons, spouses, fromId, toId) {
  if (fromId === toId) {
    return { label: 'نفس الشخص', description: '', path: [], commonAncestor: null };
  }

  const personMap = new Map(persons.map(p => [p.id, p]));
  const personA = personMap.get(fromId);
  const personB = personMap.get(toId);

  if (!personA || !personB) return null;

  // Build graph and find BFS path
  const graph = buildFamilyGraph(persons, spouses);
  const path = findPath(graph, fromId, toId);

  if (!path) {
    return {
      label: 'لا توجد صلة',
      description: `لم يتم العثور على صلة بين ${personA.first_name} و${personB.first_name}`,
      path: [],
      commonAncestor: null,
    };
  }

  // Check if path goes through a spouse edge
  const hasSpouseEdge = path.some(step => step.edge?.type === 'spouse');

  if (hasSpouseEdge) {
    return labelSpouseRelationship(path, personMap, persons, spouses);
  }

  // Find LCA for blood relationships
  const lca = findLCA(fromId, toId, personMap);

  if (!lca) {
    return {
      label: 'قريب',
      description: `${personA.first_name} و${personB.first_name} أقارب`,
      path: formatPath(path, personMap),
      commonAncestor: null,
    };
  }

  const result = labelRelationship(fromId, toId, personMap, lca);
  const lcaPerson = personMap.get(lca.lcaId);

  return {
    label: result.label,
    description: result.description,
    path: formatPath(path, personMap),
    commonAncestor: lcaPerson ? {
      id: lcaPerson.id,
      first_name: lcaPerson.first_name,
      family_name: lcaPerson.family_name,
    } : null,
  };
}

/**
 * Handle relationships that go through a spouse edge
 */
function labelSpouseRelationship(path, personMap, persons, spouses) {
  // Find the spouse edge index
  const spouseIdx = path.findIndex(step => step.edge?.type === 'spouse');

  if (spouseIdx === path.length - 1 && spouseIdx === 1) {
    // Direct spouse
    const personA = personMap.get(path[0].id);
    const personB = personMap.get(path[1].id);
    const bIsMale = personB.gender === 'male';
    return {
      label: bIsMale ? 'زوجها' : 'زوجته',
      description: `${personA.first_name} و${personB.first_name} متزوجان`,
      path: formatPath(path, personMap),
      commonAncestor: null,
    };
  }

  const personA = personMap.get(path[0].id);
  const personB = personMap.get(path[path.length - 1].id);
  const aIsMale = personA.gender === 'male';

  // Analyze the two segments around the spouse edge
  // Segment before spouse: path[0..spouseIdx-1] (A's side)
  // Segment after spouse: path[spouseIdx..end] (B's side)
  const preSpouseId = path[spouseIdx - 1]?.id;  // person on A's side of marriage
  const postSpouseId = path[spouseIdx]?.id;      // person on B's side of marriage
  const preSpouse = personMap.get(preSpouseId);
  const postSpouse = personMap.get(postSpouseId);

  // Count steps on each side (excluding the spouse edge itself)
  const stepsBeforeSpouse = spouseIdx - 1;  // steps from A to preSpouse
  const stepsAfterSpouse = path.length - 1 - spouseIdx;  // steps from postSpouse to B

  // Determine edge types on each side
  const edgesBeforeSpouse = path.slice(1, spouseIdx).map(s => s.edge?.type);
  const edgesAfterSpouse = path.slice(spouseIdx + 1).map(s => s.edge?.type);

  // Helper: describe a one-side relationship
  const describeOneSide = (steps, edges, targetPerson, isFromA) => {
    if (steps === 0) return { role: 'self', gender: targetPerson?.gender };
    if (steps === 1) {
      const edge = edges[0];
      if (edge === 'parent') return { role: 'parent', gender: targetPerson?.gender };
      if (edge === 'child') return { role: 'child', gender: targetPerson?.gender };
    }
    if (steps === 2 && edges[0] === 'parent' && edges[1] === 'child') return { role: 'sibling', gender: targetPerson?.gender };
    if (steps === 2 && edges[0] === 'parent' && edges[1] === 'parent') return { role: 'grandparent', gender: targetPerson?.gender };
    if (steps === 2 && edges[0] === 'child' && edges[1] === 'child') return { role: 'grandchild', gender: targetPerson?.gender };
    return { role: 'relative', gender: targetPerson?.gender };
  };

  const sideA = describeOneSide(stepsBeforeSpouse, edgesBeforeSpouse, preSpouse, true);
  const sideB = describeOneSide(stepsAfterSpouse, edgesAfterSpouse, personB, false);

  // Build specific in-law labels
  const spouseWord = aIsMale ? 'زوجته' : 'زوجه';

  // A's spouse is B's relative — B is relative of A's spouse
  if (sideA.role === 'self') {
    // A is directly married to someone, B is relative of that spouse
    if (sideB.role === 'parent') {
      const bIsMale = personB.gender === 'male';
      return {
        label: bIsMale ? `أبو ${spouseWord}` : `أم ${spouseWord}`,
        description: `${personB.first_name} ${bIsMale ? 'هو أبو' : 'هي أم'} ${spouseWord === 'زوجته' ? 'زوجة' : 'زوج'} ${personA.first_name}`,
        path: formatPath(path, personMap),
        commonAncestor: null,
      };
    }
    if (sideB.role === 'sibling') {
      const bIsMale = personB.gender === 'male';
      return {
        label: bIsMale ? `أخو ${spouseWord}` : `أخت ${spouseWord}`,
        description: `${personB.first_name} ${bIsMale ? 'أخو' : 'أخت'} ${postSpouse?.first_name || ''}`,
        path: formatPath(path, personMap),
        commonAncestor: null,
      };
    }
    if (sideB.role === 'child') {
      const bIsMale = personB.gender === 'male';
      return {
        label: bIsMale ? `ابن ${spouseWord}` : `بنت ${spouseWord}`,
        description: `${personB.first_name} ${bIsMale ? 'ابن' : 'بنت'} ${postSpouse?.first_name || ''}`,
        path: formatPath(path, personMap),
        commonAncestor: null,
      };
    }
  }

  // B is directly married to A's relative
  if (sideB.role === 'self') {
    // B is the spouse of someone who is A's relative
    if (sideA.role === 'parent') {
      const bIsMale = personB.gender === 'male';
      return {
        label: bIsMale ? `زوج أمه` : `زوجة أبوه`,
        description: `${personB.first_name} ${bIsMale ? 'زوج أم' : 'زوجة أب'} ${personA.first_name}`,
        path: formatPath(path, personMap),
        commonAncestor: null,
      };
    }
    if (sideA.role === 'sibling') {
      const bIsMale = personB.gender === 'male';
      return {
        label: bIsMale ? `زوج أخته` : `زوجة أخوه`,
        description: `${personB.first_name} ${bIsMale ? 'زوج أخت' : 'زوجة أخ'} ${personA.first_name}`,
        path: formatPath(path, personMap),
        commonAncestor: null,
      };
    }
    if (sideA.role === 'child') {
      const bIsMale = personB.gender === 'male';
      return {
        label: bIsMale ? `زوج ابنته` : `زوجة ابنه`,
        description: `${personB.first_name} ${bIsMale ? 'زوج بنت' : 'زوجة ابن'} ${personA.first_name}`,
        path: formatPath(path, personMap),
        commonAncestor: null,
      };
    }
  }

  // Generic fallback for complex paths through marriage
  return {
    label: `عن طريق المصاهرة`,
    description: `${personA.first_name} و${personB.first_name} مرتبطان عن طريق المصاهرة (عبر ${preSpouse?.first_name || ''} و${postSpouse?.first_name || ''})`,
    path: formatPath(path, personMap),
    commonAncestor: null,
  };
}

/**
 * Format path for API response
 */
function formatPath(path, personMap) {
  return path.map(step => {
    const person = personMap.get(step.id);
    return {
      person: person ? {
        id: person.id,
        first_name: person.first_name,
        family_name: person.family_name,
        gender: person.gender,
      } : { id: step.id },
      edge: step.edge ? step.edge.type : null,
    };
  });
}

module.exports = {
  findRelationship,
  buildFamilyGraph,
  findPath,
  findLCA,
  labelRelationship,
};
