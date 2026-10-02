export default function Card({ title, description, actions, children, className = "" }) {
  return <section className={`dashboard-panel glass-card ${className}`}>
    {(title || description || actions) && <div className="panel-heading"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{actions}</div>}
    {children}
  </section>;
}
