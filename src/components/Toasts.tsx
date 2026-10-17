import { useUI } from '../state/ui';

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const banner = useUI((s) => s.banner);
  return (
    <>
      {banner && (
        <div className={`phase-banner ${banner.text.length > 12 ? 'long' : ''}`} key={banner.key} aria-live="polite">
          <span className="phase-banner-text">{banner.text}</span>
          {banner.sub && <span className="phase-banner-sub">{banner.sub}</span>}
        </div>
      )}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast surface ${t.tone ?? ''}`}>
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
