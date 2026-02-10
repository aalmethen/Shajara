export default function Select({
  label,
  error,
  options = [],
  placeholder = 'اختر...',
  className = '',
  id,
  ...props
}) {
  const selectId = id || label?.replace(/\s+/g, '-');

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-300"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 bg-navy-800 border rounded-lg text-white
          focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors
          ${error ? 'border-red-500' : 'border-navy-600'}
        `}
        dir="rtl"
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
