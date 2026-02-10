export default function Input({
  label,
  error,
  className = '',
  id,
  ...props
}) {
  const inputId = id || label?.replace(/\s+/g, '-');

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 bg-navy-800 border rounded-lg text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors
          ${error ? 'border-red-500' : 'border-navy-600'}
        `}
        dir="rtl"
        {...props}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
