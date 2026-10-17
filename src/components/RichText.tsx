import { Fragment } from 'react';

/** Night-sheet text marks token names as *LIKE THIS* and reminder placements as :reminder:. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*|:reminder:)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p === ':reminder:') return <span key={i} className="reminder-glyph" title="Place a reminder token" />;
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <span key={i} className="tok-word">{p.slice(1, -1).toLowerCase()}</span>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}
