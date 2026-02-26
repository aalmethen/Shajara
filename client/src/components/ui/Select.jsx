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
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-800
          focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors
          ${error ? 'border-red-500' : 'border-gray-300'}
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
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
