import { useState, useMemo } from 'react';

export default function TreeControls({
  persons,
  lineageMode,
  onToggleLineage,
  rootPersonId,
  onChangeRoot,
  maxDepth,
  onChangeDepth,
  onSelectPerson,
  onComparePersons,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return persons
      .filter(p =>
        p.first_name.includes(q) ||
        (p.family_name && p.family_name.includes(q))
      )
      .slice(0, 8);
  }, [searchQuery, persons]);

  // Root person options
  const rootOptions = useMemo(() => {
    return persons
      .filter(p => p.gender === 'male' || !p.father_id)
      .map(p => ({
        value: p.id,
        label: `${p.first_name} ${p.family_name || ''}`.trim(),
      }));
  }, [persons]);

  return (
    <div className="absolute top-4 right-4 z-30 flex flex-col gap-2 w-64">
      {/* Lineage Mode Toggle */}
      <div className="bg-navy-800/95 backdrop-blur-sm border border-navy-600 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleLineage}
            className={`flex-1 text-xs py-2 rounded-lg transition-colors cursor-pointer font-medium
              ${lineageMode === 'male'
                ? 'bg-gold-500 text-navy-900'
                : 'bg-navy-700 text-gray-400 hover:text-white'
              }`}
          >
            نسب الذكور
          </button>
          <button
            onClick={onToggleLineage}
            className={`flex-1 text-xs py-2 rounded-lg transition-colors cursor-pointer font-medium
              ${lineageMode === 'full'
                ? 'bg-gold-500 text-navy-900'
                : 'bg-navy-700 text-gray-400 hover:text-white'
              }`}
          >
            شجرة كاملة
          </button>
        </div>
      </div>

      {/* Root Person Selector */}
      <div className="bg-navy-800/95 backdrop-blur-sm border border-navy-600 rounded-xl p-3">
        <label className="text-xs text-gray-500 block mb-1">الجذر</label>
        <select
          value={rootPersonId || ''}
          onChange={(e) => onChangeRoot(e.target.value)}
          className="w-full text-sm bg-navy-700 border border-navy-600 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-gold-500"
          dir="rtl"
        >
          {rootOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Depth Slider */}
      <div className="bg-navy-800/95 backdrop-blur-sm border border-navy-600 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">الأجيال</label>
          <span className="text-xs text-gold-500">{maxDepth}</span>
        </div>
        <input
          type="range"
          min="1"
          max="15"
          value={maxDepth}
          onChange={(e) => onChangeDepth(parseInt(e.target.value))}
          className="w-full accent-gold-500"
        />
      </div>

      {/* Search */}
      <div className="bg-navy-800/95 backdrop-blur-sm border border-navy-600 rounded-xl p-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
            onFocus={() => setShowSearch(true)}
            placeholder="بحث بالاسم..."
            className="w-full text-sm bg-navy-700 border border-navy-600 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gold-500"
            dir="rtl"
          />

          {/* Search Results Dropdown */}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-navy-700 border border-navy-600 rounded-lg shadow-xl overflow-hidden z-50">
              {searchResults.map(person => (
                <button
                  key={person.id}
                  onClick={() => {
                    if (onSelectPerson) {
                      onSelectPerson(person);
                    } else {
                      onChangeRoot(person.id);
                    }
                    setSearchQuery('');
                    setShowSearch(false);
                  }}
                  className="w-full text-right px-3 py-2 text-sm text-gray-300 hover:bg-navy-600 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span className="text-xs">{person.gender === 'male' ? '👨' : '👩'}</span>
                  <span>{person.first_name} {person.family_name || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compare Two People */}
      {onComparePersons && (
        <div className="bg-navy-800/95 backdrop-blur-sm border border-navy-600 rounded-xl p-3">
          <button
            onClick={onComparePersons}
            className="w-full text-xs py-2 rounded-lg bg-navy-700 text-gray-300 hover:text-white hover:bg-navy-600 transition-colors cursor-pointer font-medium"
          >
            مقارنة شخصين
          </button>
        </div>
      )}
    </div>
  );
}
