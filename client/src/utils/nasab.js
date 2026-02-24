/**
 * Get the full display name for a person: first_name + بن/بنت father + family_name
 * Used in dropdowns, search results, and everywhere a person is looked up.
 *
 * @param {Object} person - The person object
 * @param {Array|Map} personsOrMap - All persons array, or a Map of id->person
 * @returns {string} e.g. "أحمد بن محمد الفلاني"
 */
export function personFullName(person, personsOrMap) {
  if (!person) return '';

  const parts = [person.first_name];

  // Resolve father's first name
  let fatherFirstName = person.father_first_name; // may already be joined from server
  if (!fatherFirstName && person.father_id && personsOrMap) {
    const personMap = personsOrMap instanceof Map
      ? personsOrMap
      : new Map(personsOrMap.map(p => [p.id, p]));
    const father = personMap.get(person.father_id);
    if (father) {
      fatherFirstName = father.first_name;
    }
  }

  if (fatherFirstName) {
    const connector = person.gender === 'male' ? 'بن' : 'بنت';
    parts.push(connector, fatherFirstName);
  }

  if (person.family_name) {
    parts.push(person.family_name);
  }

  return parts.join(' ');
}

/**
 * Generate nasab (النسب) string from a person and their ancestors
 * Traverses the father_id chain upward
 *
 * @param {Object} person - The person to generate nasab for
 * @param {Array} allPersons - All persons in the tree
 * @returns {string} Nasab string like "أحمد بن محمد بن عبدالله الفلاني"
 */
export function generateNasab(person, allPersons) {
  if (!person) return '';

  const personMap = new Map(allPersons.map(p => [p.id, p]));
  const parts = [person.first_name];
  const connector = person.gender === 'male' ? 'بن' : 'بنت';

  let current = person;
  let depth = 0;
  const maxDepth = 20; // Safety limit

  while (current.father_id && depth < maxDepth) {
    const father = personMap.get(current.father_id);
    if (!father) break;

    parts.push(depth === 0 ? connector : 'بن');
    parts.push(father.first_name);
    current = father;
    depth++;
  }

  // Append family name from the person or first ancestor that has one
  const familyName = person.family_name ||
    (() => {
      let p = person;
      while (p.father_id) {
        const father = personMap.get(p.father_id);
        if (!father) break;
        if (father.family_name) return father.family_name;
        p = father;
      }
      return null;
    })();

  if (familyName) {
    parts.push(familyName);
  }

  return parts.join(' ');
}

/**
 * Get the ancestor chain for a person (through father_id)
 * @param {Object} person
 * @param {Array} allPersons
 * @returns {Array} Array of persons from self to oldest ancestor
 */
export function getAncestorChain(person, allPersons) {
  if (!person) return [];

  const personMap = new Map(allPersons.map(p => [p.id, p]));
  const chain = [person];
  let current = person;
  const maxDepth = 50;
  let depth = 0;

  while (current.father_id && depth < maxDepth) {
    const father = personMap.get(current.father_id);
    if (!father) break;
    chain.push(father);
    current = father;
    depth++;
  }

  return chain;
}
