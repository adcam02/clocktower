import { useEffect, type ReactNode } from 'react';
import { ui } from '../state/ui';
import { Icon } from './Icon';

export function Modal({
  title,
  eyebrow,
  children,
  footer,
  size = 'md',
  className = '',
  onClose = ui.close,
  head,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClose?: () => void;
  head?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal surface size-${size} ${className}`} role="dialog" aria-modal="true">
        <header className="modal-head">
          <div className="modal-titles">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2>{title}</h2>
          </div>
          {head}
          <button className="btn quiet square modal-close" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        <div className="modal-body scroll">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}
