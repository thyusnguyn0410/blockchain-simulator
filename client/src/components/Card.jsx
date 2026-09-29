export default function Card({ as: Element = 'section', className = '', children, ...props }) {
  return (
    <Element {...props} className={`glass-panel ${className}`.trim()}>
      {children}
    </Element>
  );
}
