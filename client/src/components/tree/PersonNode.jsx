import { memo } from 'react';

const PersonNode = memo(function PersonNode({ person, spouses, isSelected, onClick }) {
  const isMale = person.gender === 'male';
  const isDeceased = person.status === 'deceased';

  const birthYear = person.birth_date?.match(/\d{4}/)?.[0] || '';
  const deathYear = person.death_date?.match(/\d{4}/)?.[0] || '';

  return (
    <div className="flex items-center gap-1" dir="rtl">
      {/* Main person node */}
      <div
        onClick={() => onClick?.(person)}
        className={`
          tree-node cursor-pointer select-none
          px-4 py-2.5 min-w-[120px] text-center
          border-2 transition-all duration-200
          ${isMale
            ? 'rounded-lg border-gold-500/60 bg-white'
            : 'rounded-full border-pink-400/60 bg-white'
          }
          ${isDeceased ? 'opacity-60' : ''}
          ${isSelected
            ? 'ring-2 ring-gold-400 shadow-lg shadow-gold-500/20 border-gold-400'
            : 'hover:border-gold-400/80 hover:shadow-md hover:shadow-gold-500/10'
          }
        `}
      >
        {/* Name */}
        <div className={`text-sm font-semibold ${isDeceased ? 'text-gray-400' : 'text-gray-800'}`}>
          {person.first_name}
        </div>

        {/* Dates */}
        {(birthYear || deathYear) && (
          <div className="text-[10px] text-gray-500 mt-0.5" dir="ltr">
            {birthYear && deathYear
              ? `${birthYear} - ${deathYear}`
              : birthYear
              ? `${birthYear}`
              : `- ${deathYear}`
            }
          </div>
        )}

        {/* Deceased indicator */}
        {isDeceased && (
          <div className="text-[10px] text-gray-600 mt-0.5">رحمه الله</div>
        )}
      </div>

      {/* Spouse nodes */}
      {spouses?.map(({ spouse, relationship }, idx) => (
        <div key={spouse.id} className="flex items-center gap-1">
          {/* Marriage connector line */}
          <div className="w-4 h-[2px] bg-gold-500/40" />

          {/* Spouse node */}
          <div
            onClick={() => onClick?.(spouse)}
            className={`
              tree-node cursor-pointer select-none
              px-3 py-2 min-w-[90px] text-center
              border transition-all duration-200
              ${spouse.gender === 'male'
                ? 'rounded-lg border-gold-500/40 bg-gray-50'
                : 'rounded-full border-pink-400/40 bg-gray-50'
              }
              ${spouse.status === 'deceased' ? 'opacity-60' : ''}
              hover:border-gold-400/60
            `}
          >
            <div className={`text-xs font-medium ${spouse.status === 'deceased' ? 'text-gray-400' : 'text-gray-600'}`}>
              {spouse.first_name}
            </div>
            {relationship.marriage_order > 1 && (
              <div className="text-[9px] text-gray-600">
                الزوجة {relationship.marriage_order}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

export default PersonNode;
