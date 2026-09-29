import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="modal-title"
        aria-modal="true"
        className={`glass-panel modal-panel ${className}`.trim()}
        role="dialog"
      >
        <header className="panel-heading">
          <h2 id="modal-title">{title}</h2>
          <button className="outline-button" type="button" onClick={onClose} aria-label="Đóng hộp thoại">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}
