import { useState, useEffect, useCallback } from 'react';
import { treesAPI, personsAPI, spousesAPI } from '../api/client';

export function useTreeData(slug) {
  const [tree, setTree] = useState(null);
  const [persons, setPersons] = useState([]);
  const [spouses, setSpouses] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [lineageMode, setLineageMode] = useState('male'); // 'male' or 'full'
  const [rootPersonId, setRootPersonId] = useState(null);
  const [maxDepth, setMaxDepth] = useState(10);
  const [linkedPersonId, setLinkedPersonId] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchTree = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    try {
      const res = await treesAPI.getBySlug(slug);
      const { tree, persons, spouses, isAdmin, linkedPersonId, hasMore: more } = res.data;
      setTree(tree);
      setPersons(persons);
      setSpouses(spouses);
      setIsAdmin(isAdmin);
      setLinkedPersonId(linkedPersonId || null);
      setHasMore(more || false);
      setRootPersonId(tree.root_person_id || (persons[0]?.id ?? null));
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في تحميل الشجرة');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const addPerson = async (data) => {
    if (!tree) return;
    const res = await personsAPI.create(tree.id, data);
    setPersons(prev => [...prev, res.data.person]);
    return res.data.person;
  };

  const updatePerson = async (id, data) => {
    if (!tree) return;
    const res = await personsAPI.update(tree.id, id, data);
    setPersons(prev => prev.map(p => p.id === id ? res.data.person : p));
    if (selectedPerson?.id === id) {
      setSelectedPerson(res.data.person);
    }
    return res.data.person;
  };

  const deletePerson = async (id) => {
    if (!tree) return;
    await personsAPI.delete(tree.id, id);
    setPersons(prev => prev.filter(p => p.id !== id));
    if (selectedPerson?.id === id) {
      setSelectedPerson(null);
    }
  };

  const addSpouse = async (data) => {
    if (!tree) return;
    const res = await spousesAPI.create(tree.id, data);
    setSpouses(prev => [...prev, res.data.spouse]);
    return res.data.spouse;
  };

  const deleteSpouse = async (id) => {
    if (!tree) return;
    await spousesAPI.delete(tree.id, id);
    setSpouses(prev => prev.filter(s => s.id !== id));
  };

  const setRootPerson = (personId) => {
    setRootPersonId(personId);
  };

  const toggleLineageMode = () => {
    setLineageMode(prev => prev === 'male' ? 'full' : 'male');
  };

  return {
    tree,
    persons,
    spouses,
    isAdmin,
    loading,
    error,
    selectedPerson,
    setSelectedPerson,
    lineageMode,
    setLineageMode,
    toggleLineageMode,
    rootPersonId,
    setRootPerson,
    maxDepth,
    setMaxDepth,
    linkedPersonId,
    hasMore,
    addPerson,
    updatePerson,
    deletePerson,
    addSpouse,
    deleteSpouse,
    refetch: fetchTree,
  };
}
