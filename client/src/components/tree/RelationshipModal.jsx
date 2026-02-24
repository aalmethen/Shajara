import { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { treesAPI } from '../../api/client';
import { personFullName } from '../../utils/nasab';

export default function RelationshipModal({
  isOpen,
  onClose,
  treeId,
  persons = [],
  initialFromId,
  initialToId,
}) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFromId(initialFromId || '');
      setToId(initialToId || '');
      setResult(null);
      setError('');
      setFromSearch('');
      setToSearch('');
    }
  }, [isOpen, initialFromId, initialToId]);

  // Auto-search when both IDs are pre-set
  useEffect(() => {
    if (isOpen && initialFromId && initialToId && treeId) {
      handleFind(initialFromId, initialToId);
    }
  }, [isOpen, initialFromId, initialToId, treeId]);

  const sortedPersons = useMemo(() => {
    return [...persons].sort((a, b) => a.first_name.localeCompare(b.first_name, 'ar'));
  }, [persons]);

  const filteredFromPersons = useMemo(() => {
    if (!fromSearch) return sortedPersons;
    return sortedPersons.filter(p =>
      p.first_name.includes(fromSearch) ||
      (p.family_name && p.family_name.includes(fromSearch))
    );
  }, [sortedPersons, fromSearch]);

  const filteredToPersons = useMemo(() => {
    if (!toSearch) return sortedPersons;
    return sortedPersons.filter(p =>
      p.first_name.includes(toSearch) ||
      (p.family_name && p.family_name.includes(toSearch))
    );
  }, [sortedPersons, toSearch]);

  const handleFind = async (overrideFrom, overrideTo) => {
    const from = overrideFrom || fromId;
    const to = overrideTo || toId;

    if (!from || !to) {
      setError('يجب اختيار شخصين');
      return;
    }
    if (from === to) {
      setError('يجب اختيار شخصين مختلفين');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await treesAPI.relationship(treeId, from, to);
      setResult(res.data.relationship);
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ في البحث عن العلاقة');
    } finally {
      setLoading(false);
    }
  };

  const getPersonName = (id) => {
    const p = persons.find(p => p.id === id);
    return p ? personFullName(p, persons) : '';
  };

  const getEdgeLabel = (edge) => {
    const labels = {
      'parent': '↑ أب/أم',
      'child': '↓ ابن/بنت',
      'spouse': '⟷ زوج/ة',
    };
    return labels[edge] || edge;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="اكتشف العلاقة" maxWidth="max-w-xl">
      <div className="space-y-5">
        {/* Person A selector */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">الشخص الأول</label>
          <input
            type="text"
            placeholder="ابحث بالاسم..."
            value={fromSearch}
            onChange={(e) => setFromSearch(e.target.value)}
            className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm mb-1 focus:border-gold-500 focus:outline-none"
            dir="rtl"
          />
          <select
            value={fromId}
            onChange={(e) => { setFromId(e.target.value); setResult(null); }}
            className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:border-gold-500 focus:outline-none"
            dir="rtl"
            size={fromSearch ? Math.min(filteredFromPersons.length, 6) : 1}
          >
            <option value="">اختر شخصاً...</option>
            {filteredFromPersons.map(p => (
              <option key={p.id} value={p.id}>
                {p.gender === 'male' ? '👨' : '👩'} {personFullName(p, persons)}
              </option>
            ))}
          </select>
          {fromId && (
            <span className="text-xs text-gold-500 mt-1 block">
              {getPersonName(fromId)}
            </span>
          )}
        </div>

        {/* Person B selector */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">الشخص الثاني</label>
          <input
            type="text"
            placeholder="ابحث بالاسم..."
            value={toSearch}
            onChange={(e) => setToSearch(e.target.value)}
            className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm mb-1 focus:border-gold-500 focus:outline-none"
            dir="rtl"
          />
          <select
            value={toId}
            onChange={(e) => { setToId(e.target.value); setResult(null); }}
            className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-white text-sm focus:border-gold-500 focus:outline-none"
            dir="rtl"
            size={toSearch ? Math.min(filteredToPersons.length, 6) : 1}
          >
            <option value="">اختر شخصاً...</option>
            {filteredToPersons.map(p => (
              <option key={p.id} value={p.id}>
                {p.gender === 'male' ? '👨' : '👩'} {personFullName(p, persons)}
              </option>
            ))}
          </select>
          {toId && (
            <span className="text-xs text-gold-500 mt-1 block">
              {getPersonName(toId)}
            </span>
          )}
        </div>

        {/* Find button */}
        <Button
          onClick={() => handleFind()}
          disabled={loading || !fromId || !toId}
          className="w-full"
        >
          {loading ? 'جاري البحث...' : 'اكتشف العلاقة'}
        </Button>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Main label */}
            <div className="text-center bg-navy-900 rounded-xl p-6 border border-gold-500/30">
              <p className="text-3xl font-bold text-gold-500 font-amiri mb-2">
                {result.label}
              </p>
              {result.description && (
                <p className="text-sm text-gray-300 leading-relaxed">
                  {result.description}
                </p>
              )}
              {result.commonAncestor && (
                <p className="text-xs text-gray-500 mt-2">
                  الجد المشترك: <span className="text-gold-500">{personFullName(result.commonAncestor, persons)}</span>
                </p>
              )}
            </div>

            {/* Path visualization */}
            {result.path && result.path.length > 0 && (
              <div>
                <h4 className="text-xs text-gray-400 font-semibold mb-3 text-center">مسار العلاقة</h4>
                <div className="flex flex-col items-center gap-1">
                  {result.path.map((step, i) => (
                    <div key={i} className="flex flex-col items-center">
                      {i > 0 && step.edge && (
                        <div className="text-xs text-gold-500/70 py-1">
                          {getEdgeLabel(step.edge)}
                        </div>
                      )}
                      <div className={`px-4 py-2 rounded-lg border text-sm ${
                        i === 0
                          ? 'bg-navy-700 border-gold-500/50 text-gold-400'
                          : i === result.path.length - 1
                          ? 'bg-navy-700 border-gold-500/50 text-gold-400'
                          : result.commonAncestor && step.person?.id === result.commonAncestor.id
                          ? 'bg-gold-500/10 border-gold-500/50 text-gold-300'
                          : 'bg-navy-900 border-navy-600 text-gray-300'
                      }`}>
                        <span className="ml-1">
                          {step.person?.gender === 'male' ? '👨' : '👩'}
                        </span>
                        {step.person ? personFullName(step.person, persons) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
