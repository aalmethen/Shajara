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
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 bg-white border rounded-lg text-gray-800 placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-colors
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        dir="rtl"
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
