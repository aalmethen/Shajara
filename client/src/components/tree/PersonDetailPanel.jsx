import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { generateNasab, personFullName } from '../../utils/nasab';
import Button from '../ui/Button';

export default function PersonDetailPanel({
  person,
  persons,
  spouses,
  isAdmin,
  currentTree,
  onClose,
  onViewFromHere,
  onAddChild,
  onEdit,
  onAddSpouse,
  onDelete,
  onDeleteSpouse,
  linkedPersonId,
  onFindRelationship,
  onCompareWith,
}) {
  // Generate nasab
  const nasab = useMemo(() => {
    return generateNasab(person, persons);
  }, [person, persons]);

  // Get person's spouses
  const personSpouses = useMemo(() => {
    const personMap = new Map(persons.map(p => [p.id, p]));
    return spouses
      .filter(s => s.person_a_id === person.id || s.person_b_id === person.id)
      .map(s => {
        const spouseId = s.person_a_id === person.id ? s.person_b_id : s.person_a_id;
        return {
          ...s,
          spouse: personMap.get(spouseId),
        };
      })
      .filter(s => s.spouse)
      .sort((a, b) => (a.marriage_order || 1) - (b.marriage_order || 1));
  }, [person, persons, spouses]);

  // Get children
  const children = useMemo(() => {
    return persons.filter(p =>
      p.father_id === person.id || p.mother_id === person.id
    );
  }, [person, persons]);

  // Get parents
  const father = useMemo(() => persons.find(p => p.id === person.father_id), [person, persons]);
  const mother = useMemo(() => persons.find(p => p.id === person.mother_id), [person, persons]);

  // Group children by other parent
  const childrenGroups = useMemo(() => {
    const personMap = new Map(persons.map(p => [p.id, p]));
    const groups = new Map();

    for (const child of children) {
      const otherParentId = person.gender === 'male' ? child.mother_id : child.father_id;
      const key = otherParentId || 'unknown';

      if (!groups.has(key)) {
        const otherParent = otherParentId ? personMap.get(otherParentId) : null;
        groups.set(key, {
          parentName: otherParent?.first_name || 'غير معروف',
          children: [],
        });
      }
      groups.get(key).children.push(child);
    }

    return Array.from(groups.values());
  }, [person, children, persons]);

  const birthYear = person.birth_date?.match(/\d{4}/)?.[0] || person.birth_date;
  const deathYear = person.death_date?.match(/\d{4}/)?.[0] || person.death_date;

  return (
    <div className="fixed top-0 right-0 h-full w-96 max-w-[90vw] bg-navy-800 border-l border-navy-600 shadow-2xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-navy-800 border-b border-navy-700 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">تفاصيل الشخص</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-navy-700 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Person icon & name */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-navy-700 flex items-center justify-center text-2xl mb-3 border-2 border-gold-500/30">
            {person.gender === 'male' ? '👨' : '👩'}
          </div>
          <h3 className="text-xl font-bold text-white">
            {personFullName(person, persons)}
          </h3>

          {/* Status badge */}
          <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full
            ${person.status === 'deceased'
              ? 'bg-gray-700 text-gray-400'
              : 'bg-green-900/30 text-green-400 border border-green-500/30'
            }`}
          >
            {person.status === 'deceased' ? 'متوفى' : 'على قيد الحياة'}
          </span>

          {/* Link to original tree if person belongs to another tree */}
          {person.home_tree_id && currentTree && person.home_tree_id !== currentTree.id && person.home_tree_slug && (
            <Link
              to={`/tree/${person.home_tree_slug}`}
              className="inline-flex items-center gap-1.5 mt-2 mr-2 text-xs px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/30 hover:bg-blue-900/50 hover:border-blue-500/50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {person.home_tree_name || 'الشجرة الأصلية'}
            </Link>
          )}
        </div>

        {/* Nasab */}
        {nasab && (
          <div className="bg-navy-900 rounded-lg p-4 border border-navy-700">
            <h4 className="text-xs text-gold-500 font-semibold mb-2">النسب</h4>
            <p className="font-amiri text-lg text-gray-200 leading-loose">
              {nasab}
            </p>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          {birthYear && (
            <div className="bg-navy-900 rounded-lg p-3 border border-navy-700">
              <div className="text-xs text-gray-500 mb-1">الميلاد</div>
              <div className="text-sm text-white">{birthYear}</div>
            </div>
          )}
          {deathYear && (
            <div className="bg-navy-900 rounded-lg p-3 border border-navy-700">
              <div className="text-xs text-gray-500 mb-1">الوفاة</div>
              <div className="text-sm text-white">{deathYear}</div>
            </div>
          )}
        </div>

        {/* Bio */}
        {person.bio && (
          <div>
            <h4 className="text-xs text-gray-500 font-semibold mb-2">نبذة</h4>
            <p className="text-sm text-gray-300 leading-relaxed">{person.bio}</p>
          </div>
        )}

        {/* Parents */}
        {(father || mother) && (
          <div>
            <h4 className="text-xs text-gray-500 font-semibold mb-2">الوالدان</h4>
            <div className="space-y-2">
              {father && (
                <button
                  onClick={() => onViewFromHere?.(father.id)}
                  className="w-full text-right bg-navy-900 rounded-lg p-3 border border-navy-700 hover:border-gold-500/40 transition-colors cursor-pointer"
                >
                  <span className="text-xs text-gray-500">الأب:</span>
                  <span className="text-sm text-white mr-2">{personFullName(father, persons)}</span>
                </button>
              )}
              {mother && (
                <button
                  onClick={() => onViewFromHere?.(mother.id)}
                  className="w-full text-right bg-navy-900 rounded-lg p-3 border border-navy-700 hover:border-pink-400/40 transition-colors cursor-pointer"
                >
                  <span className="text-xs text-gray-500">الأم:</span>
                  <span className="text-sm text-white mr-2">{personFullName(mother, persons)}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Spouses */}
        {personSpouses.length > 0 && (
          <div>
            <h4 className="text-xs text-gray-500 font-semibold mb-2">
              {person.gender === 'male' ? 'الزوجات' : 'الأزواج'}
            </h4>
            <div className="space-y-2">
              {personSpouses.map(({ spouse, ...s }) => (
                <div key={s.id} className="bg-navy-900 rounded-lg p-3 border border-navy-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{personFullName(spouse, persons)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {s.status === 'married' ? 'متزوجان' : s.status === 'divorced' ? 'مطلقان' : 'أرملة'}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف علاقة الزواج مع "${personFullName(spouse, persons)}"؟`)) {
                              onDeleteSpouse?.(s.id);
                            }
                          }}
                          className="text-xs text-red-400/50 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  {s.marriage_date && (
                    <div className="text-xs text-gray-500 mt-1">الزواج: {s.marriage_date}</div>
                  )}
                  {spouse.home_tree_id && currentTree && spouse.home_tree_id !== currentTree.id && spouse.home_tree_slug && (
                    <Link
                      to={`/tree/${spouse.home_tree_slug}`}
                      className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      عرض في {spouse.home_tree_name || 'شجرتها'}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Children */}
        {childrenGroups.length > 0 && (
          <div>
            <h4 className="text-xs text-gray-500 font-semibold mb-2">الأبناء</h4>
            {childrenGroups.map((group, gi) => (
              <div key={gi} className="mb-3">
                {childrenGroups.length > 1 && (
                  <div className="text-xs text-gold-500/70 mb-1">من {group.parentName}:</div>
                )}
                <div className="flex flex-wrap gap-2">
                  {group.children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => onViewFromHere?.(child.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer
                        ${child.gender === 'male'
                          ? 'bg-navy-900 border-gold-500/30 text-gray-300 hover:border-gold-500/60'
                          : 'bg-navy-900 border-pink-400/30 text-gray-300 hover:border-pink-400/60'
                        }`}
                    >
                      {personFullName(child, persons)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-navy-700 space-y-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => onViewFromHere?.(person.id)}
          >
            عرض الشجرة من هنا
          </Button>

          {/* Relationship buttons */}
          {linkedPersonId && person.id !== linkedPersonId && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => onFindRelationship?.(linkedPersonId, person.id)}
            >
              كيف أنا مرتبط بهذا الشخص؟
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onCompareWith?.(person.id)}
          >
            مقارنة مع شخص آخر
          </Button>

          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onEdit?.(person)}
              >
                تعديل
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onAddChild?.(person)}
              >
                إضافة ابن/ابنة
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onAddSpouse?.(person)}
              >
                إضافة {person.gender === 'male' ? 'زوجة' : 'زوج'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-400 hover:text-red-300"
                onClick={() => {
                  if (window.confirm(`هل أنت متأكد من حذف "${personFullName(person, persons)}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
                    onDelete?.(person.id);
                  }
                }}
              >
                حذف
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
