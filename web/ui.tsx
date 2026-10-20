import React, { useEffect, useId, useRef } from 'react';
import { initials } from './utils';

const paths: Record<string, string> = {
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  home: 'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',
  calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 18h2',
  journal: 'M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5',
  book: 'M12 5c-4-3-9-2-9-2v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2z M12 5v16',
  chart: 'M4 3v17h17 M8 15v-4 M13 15V7 M18 15V4',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M19 8a3 3 0 0 1 0 6 M22 21v-2a4 4 0 0 0-3-4',
  user: 'M20 21v-2a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v2 M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  message: 'M21 3H3v15h5l4 4v-4h9z M7 8h10 M7 12h6',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M10 2h4l1 3 3 1 3 3-2 3 2 3-3 3-3 1-1 3h-4l-1-3-3-1-3-3 2-3-2-3 3-3 3-1z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13 M16 16l5 5',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M18 6L6 18',
  check: 'M5 12l4 4L19 6',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  'arrow-right': 'M4 12h16 M14 6l6 6-6 6',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-left': 'M15 5l-7 7 7 7',
  play: 'M8 4l12 8-12 8z',
  pause: 'M8 5v14 M16 5v14',
  clock: 'M12 8v5l3 2 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20',
  dumbbell: 'M6 5v14 M3 8v8 M18 5v14 M21 8v8 M6 12h12',
  sparkles:
    'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z M20 2v4 M18 4h4',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  shield: 'M12 2l9 4v6c0 6-9 10-9 10S3 18 3 12V6z M8 12l3 3 5-6',
  logout: 'M9 3H3v18h6 M9 12h12 M17 8l4 4-4 4',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',
  edit: 'M16 3l5 5-12 12-6 1 1-6z M13 6l5 5',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  star: 'M12 3l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  target:
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10 M12 11v2',
  refresh:
    'M20 7a9 9 0 0 0-15-2L2 8 M2 2v6h6 M4 17a9 9 0 0 0 15 2l3-3 M22 22v-6h-6',
  info: 'M12 11v6 M12 7v.5 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20',
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.activity} />
    </svg>
  );
}
export function Button({
  variant = 'primary',
  busy = false,
  className = '',
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`button button-${variant} ${className}`}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
export function Card({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`card ${className}`} />;
}
export function Badge({
  children,
  tone = 'muted',
  className = '',
}: {
  children: React.ReactNode;
  tone?: 'green' | 'blue' | 'amber' | 'red' | 'muted';
  className?: string;
}) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}
export function Avatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span className={`avatar avatar-${size}`} aria-label={name}>
      {initials(name)}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="activity" size={26} />
      </span>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <Card className="stat-card">
      <span className="stat-label">{label}</span>
      <div className="stat-value">{value}</div>
      {detail && <span className="stat-detail">{detail}</span>}
    </Card>
  );
}
const modalStack: HTMLDivElement[] = [];
let overflowBeforeModals = '';
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const element = ref.current;
    if (!element) return;
    if (modalStack.length === 0)
      overflowBeforeModals = document.body.style.overflow;
    modalStack.push(element);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== element) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab' || !ref.current) return;
      const elements = Array.from(
        ref.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      ).filter((el) => el.offsetParent !== null);
      const first = elements[0],
        last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      const index = modalStack.indexOf(element);
      if (index >= 0) modalStack.splice(index, 1);
      if (modalStack.length === 0)
        document.body.style.overflow = overflowBeforeModals;
      document.removeEventListener('keydown', onKey);
      if (previous?.isConnected) previous.focus();
      else modalStack[modalStack.length - 1]?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-header">
          <h2 id={id}>{title}</h2>
          <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
            <Icon name="close" />
          </Button>
        </header>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
}
export function ConfirmDialog({
  title,
  description,
  onConfirm,
  onClose,
  busy,
  confirmLabel = 'Confirm',
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
  confirmLabel?: string;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">{description}</p>
      <div className="actions modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Keep it
        </Button>
        <Button variant="danger" busy={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
