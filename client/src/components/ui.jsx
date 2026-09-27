export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`${variant === 'outline' ? 'outline-button' : 'primary-button'} ${className}`} {...props}>{children}</button>;
}

export function Badge({ children, tone = 'success' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export function Card({ title, description, actions, children, className = '' }) {
  return <section className={`dashboard-panel ${className}`}>
    {(title || description || actions) && <div className="panel-heading"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{actions}</div>}
    {children}
  </section>;
}

export function PageHeader({ eyebrow, title, description, action }) {
  return <header className="page-header"><div><span className="page-label">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}
