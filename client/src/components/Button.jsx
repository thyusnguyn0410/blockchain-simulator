export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  const variantClass = variant === 'outline' ? 'outline-button' : 'primary-button';

  return (
    <button
      type={type}
      className={`ui-button ${variantClass} ${loading ? 'is-loading' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <span className="ui-button-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
