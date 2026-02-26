import { useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { personsAPI } from '../../api/client';
import { personFullName } from '../../utils/nasab';

/**
 * Modal for searching and selecting a person from the global graph.
 * Used when linking a parent or spouse that might already exist in another tree.
 */
export default function LinkPersonModal({
  isOpen,
  onClose,
  onSelect,
  title = 'بحث عن شخص',
  genderFilter = null, // 'male', 'female', or null
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await personsAPI.search(query.trim(), 20);
      let persons = res.data.persons || [];
      // Filter by gender if needed
      if (genderFilter) {
        persons = persons.filter(p => p.gender === genderFilter);
      }
      setResults(persons);
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, genderFilter]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelect = (person) => {
    onSelect(person);
    // Reset state
    setQuery('');
    setResults([]);
    setSearched(false);
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ابحث بالاسم الأول أو اسم العائلة..."
              autoFocus
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? '...' : 'بحث'}
          </Button>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto">
          {loading && (
            <p className="text-gray-400 text-sm text-center py-4">جاري البحث...</p>
          )}

          {!loading && searched && results.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">لم يتم العثور على نتائج</p>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map(person => (
                <button
                  key={person.id}
                  onClick={() => handleSelect(person)}
                  className="w-full text-right px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="text-sm text-gray-800">
                      {personFullName(person)}
                    </span>
                    <span className="text-xs text-gray-400 mr-2">
                      ({person.gender === 'male' ? 'ذكر' : 'أنثى'})
                    </span>
                    {person.home_tree_name && (
                      <span className="text-xs text-gold-500/70 mr-2">
                        — {person.home_tree_name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    اختيار ←
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={handleClose}>
            إلغاء
          </Button>
        </div>
      </div>
    </Modal>
  );
}
