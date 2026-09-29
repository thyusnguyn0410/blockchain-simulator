export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const variantClass = {
    primary: 'primary-button',
    outline: 'outline-button',
    danger: 'danger-button',
  }[variant];

  return (
    <button
      {...props}
      type={type}
      className={`${variantClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
