import { memo, useId } from 'react';
import { genericIcon } from '../data';
import type { InfoCard as CardId } from '../state/types';

export const CARDS: { id: CardId; title: string; tone: string }[] = [
  { id: 'useAbility', title: 'Use your ability?', tone: 'umber' },
  { id: 'makeChoice', title: 'Make a choice', tone: 'umber' },
  { id: 'notInPlay', title: 'These characters are not in play', tone: 'sapphire' },
  { id: 'thisIsDemon', title: 'This is the Demon', tone: 'crimson' },
  { id: 'theseAreMinions', title: 'These are your Minions', tone: 'crimson' },
  { id: 'youAre', title: 'You are', tone: 'amethyst' },
  { id: 'thisPlayerIs', title: 'This player is', tone: 'amethyst' },
  { id: 'selectedYou', title: 'This character selected you', tone: 'verdant' },
];

export const cardTitle = (id: CardId | null) => CARDS.find((c) => c.id === id)?.title ?? '';

/** Points where two circles cross, for drawing a crescent. */
function crescent(cx: number, cy: number, R: number, ix: number, iy: number, r: number) {
  const d = Math.hypot(ix - cx, iy - cy);
  const a = (R * R - r * r + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, R * R - a * a));
  const mx = cx + (a * (ix - cx)) / d;
  const my = cy + (a * (iy - cy)) / d;
  const p1 = { x: mx + (h * (iy - cy)) / d, y: my - (h * (ix - cx)) / d };
  const p2 = { x: mx - (h * (iy - cy)) / d, y: my + (h * (ix - cx)) / d };
  return `M ${p1.x} ${p1.y} A ${R} ${R} 0 1 0 ${p2.x} ${p2.y} A ${r} ${r} 0 1 1 ${p1.x} ${p1.y} Z`;
}

function Art({ id }: { id: CardId }) {
  switch (id) {
    case 'useAbility': {
      const feathers = Array.from({ length: 13 }, (_, i) => {
        const a = ((110 + i * 13) * Math.PI) / 180;
        const x1 = 50 + Math.cos(a) * 29;
        const y1 = 56 + Math.sin(a) * 29;
        const x2 = 50 + Math.cos(a + 0.12) * 36;
        const y2 = 56 + Math.sin(a + 0.12) * 36;
        return <path key={i} d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 + 2} ${(y1 + y2) / 2 - 2} ${x2} ${y2}`} className="stroke thin" />;
      });
      return (
        <>
          <path d={crescent(50, 56, 29, 61, 47, 25)} className="fill soft" />
          <path d={crescent(50, 56, 29, 61, 47, 25)} className="stroke" />
          {feathers}
          <path d="M 70 26 l 1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" className="fill" />
          <path d="M 80 44 l 1 2.5 2.5 1 -2.5 1 -1 2.5 -1 -2.5 -2.5 -1 2.5 -1 Z" className="fill" />
          <circle cx="74" cy="62" r="1.4" className="fill" />
        </>
      );
    }
    case 'makeChoice':
      return (
        <>
          {/* dagger */}
          <g transform="rotate(38 50 56)">
            <path d="M 50 14 L 54 22 L 54 64 L 46 64 L 46 22 Z" className="fill soft" />
            <path d="M 50 14 L 54 22 L 54 64 L 46 64 L 46 22 Z M 50 20 L 50 62" className="stroke" />
            <path d="M 38 64 Q 50 70 62 64 Q 50 60 38 64 Z" className="fill" />
            <path d="M 47.5 68 L 52.5 68 L 52.5 88 L 47.5 88 Z" className="stroke" />
            <path d="M 47.5 73 L 52.5 75 M 47.5 79 L 52.5 81" className="stroke thin" />
            <circle cx="50" cy="92" r="4" className="fill" />
          </g>
          {/* quill */}
          <g transform="rotate(-38 50 56)">
            <path d="M 50 92 Q 49 60 50 16" className="stroke" />
            <path d="M 50 20 C 64 30 66 52 52 76 C 50 70 50 40 50 20 Z" className="fill soft" />
            <path d="M 50 20 C 36 32 36 52 49 72" className="stroke" />
            <path d="M 50 20 C 64 30 66 52 52 76" className="stroke" />
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d={`M 50 ${28 + i * 5.5} L ${58 - Math.abs(i - 3) * 0.9} ${24 + i * 5.5}`} className="stroke thin" />
            ))}
            {Array.from({ length: 7 }, (_, i) => (
              <path key={`l${i}`} d={`M 50 ${30 + i * 5.5} L ${42 + Math.abs(i - 3) * 0.9} ${26 + i * 5.5}`} className="stroke thin" />
            ))}
          </g>
        </>
      );
    case 'notInPlay':
      return (
        <>
          {[33, 67].map((x) => (
            <g key={x}>
              <path d={`M ${x - 15} 58 Q ${x} 44 ${x + 15} 58 Q ${x} 68 ${x - 15} 58 Z`} className="fill soft" />
              <path d={`M ${x - 15} 58 Q ${x} 44 ${x + 15} 58 Q ${x} 68 ${x - 15} 58 Z`} className="stroke" />
              <circle cx={x + 4} cy="57" r="5.5" className="fill" />
              <circle cx={x + 4} cy="57" r="2" className="hole" />
              <path d={`M ${x - 15} 46 Q ${x} 36 ${x + 15} 43`} className="stroke" />
              {[0, 1, 2, 3].map((k) => (
                <path key={k} d={`M ${x - 9 + k * 6} ${52 - (k === 1 || k === 2 ? 1 : 0)} l ${-1 + k * 0.7} -4`} className="stroke thin" />
              ))}
            </g>
          ))}
        </>
      );
    case 'thisIsDemon':
      return (
        <>
          <path
            d="M 50 22 C 58 22 66 28 66 38 C 66 46 61 50 58 54 C 56 57 57 62 57 70 C 57 74 53 74 53 70 L 53 60 C 53 58 51 58 51 60 L 51 84 C 51 89 46 89 46 84 L 46 62 C 46 60 44 60 44 62 L 44 66 C 44 70 39 70 39 66 L 39 56 C 36 52 34 46 34 38 C 34 28 42 22 50 22 Z"
            className="fill"
          />
          <circle cx="68" cy="58" r="2.6" className="fill" />
          <circle cx="30" cy="62" r="1.8" className="fill" />
          <circle cx="62" cy="80" r="1.6" className="fill" />
          <circle cx="40" cy="78" r="2.2" className="fill" />
          <circle cx="73" cy="34" r="1.4" className="fill" />
          <circle cx="27" cy="32" r="2" className="fill" />
        </>
      );
    case 'theseAreMinions':
      return (
        <>
          {[
            { x: 36, y: 50, r: -12 },
            { x: 64, y: 58, r: 10 },
          ].map((h, i) => (
            <g key={i} transform={`rotate(${h.r} ${h.x} ${h.y})`}>
              <path d={`M ${h.x - 11} ${h.y - 8} Q ${h.x - 20} ${h.y - 20} ${h.x - 13} ${h.y - 28} Q ${h.x - 12} ${h.y - 18} ${h.x - 5} ${h.y - 13} Z`} className="fill" />
              <path d={`M ${h.x + 11} ${h.y - 8} Q ${h.x + 20} ${h.y - 20} ${h.x + 13} ${h.y - 28} Q ${h.x + 12} ${h.y - 18} ${h.x + 5} ${h.y - 13} Z`} className="fill" />
              <ellipse cx={h.x} cy={h.y} rx="14" ry="16" className="fill soft" />
              <ellipse cx={h.x} cy={h.y} rx="14" ry="16" className="stroke" />
              <path d={`M ${h.x - 8} ${h.y - 4} l 6 2.5 M ${h.x + 8} ${h.y - 4} l -6 2.5`} className="stroke" />
              <path d={`M ${h.x - 7} ${h.y + 6} Q ${h.x} ${h.y + 12} ${h.x + 7} ${h.y + 6}`} className="stroke" />
              <path d={`M ${h.x} ${h.y + 16} L ${h.x} ${h.y + 30}`} className="stroke thin" />
            </g>
          ))}
        </>
      );
    case 'youAre':
      return (
        <>
          <ellipse cx="50" cy="44" rx="19" ry="24" className="fill soft" />
          <ellipse cx="50" cy="44" rx="19" ry="24" className="stroke" />
          <ellipse cx="50" cy="44" rx="14" ry="19" className="stroke thin" />
          <path d="M 41 34 Q 44 28 50 27" className="stroke thin" />
          <path d="M 44 40 Q 46 36 49 35" className="stroke thin" />
          <path d="M 46 68 Q 50 72 54 68 L 53 74 L 47 74 Z" className="fill" />
          <path d="M 47.5 74 L 52.5 74 L 52 90 L 48 90 Z" className="stroke" />
          <circle cx="50" cy="94" r="3.6" className="fill" />
          <circle cx="50" cy="18.5" r="2.4" className="fill" />
          <path d="M 31 44 q -5 0 -6 -5 M 69 44 q 5 0 6 -5" className="stroke thin" />
        </>
      );
    case 'thisPlayerIs':
      return (
        <>
          <path d="M 24 48 Q 50 22 76 48 Q 50 70 24 48 Z" className="fill soft" />
          <path d="M 24 48 Q 50 22 76 48 Q 50 70 24 48 Z" className="stroke" />
          <circle cx="50" cy="47" r="10" className="fill" />
          <circle cx="50" cy="47" r="4" className="hole" />
          <circle cx="53" cy="44" r="1.6" className="fill soft" />
          {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
            <path key={k} d={`M ${50 + k * 7.4} ${36 + Math.abs(k) * 1.6} l ${k * 1.6} -6`} className="stroke thin" />
          ))}
          <path d="M 50 66 C 53 72 56 76 56 80 C 56 84 53 86 50 86 C 47 86 44 84 44 80 C 44 76 47 72 50 66 Z" className="fill" />
          <circle cx="50" cy="94" r="1.6" className="fill" />
        </>
      );
    case 'selectedYou':
      return (
        <>
          <path d="M 38 96 L 40 74 L 60 74 L 62 96" className="fill soft" />
          <path d="M 38 96 L 40 74 L 60 74 L 62 96 M 39 82 L 61 82" className="stroke" />
          <ellipse cx="50" cy="62" rx="13" ry="14" className="fill" />
          {[
            [41, 54, 34, 30],
            [47, 50, 45, 22],
            [53, 50, 56, 23],
            [59, 54, 66, 33],
            [39, 66, 26, 52],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="finger" />
          ))}
          <path d="M 44 66 Q 50 70 56 66" className="stroke dark" />
        </>
      );
  }
}

export const InfoCard = memo(function InfoCard({ id, size = 'md' }: { id: CardId; size?: 'sm' | 'md' | 'lg' }) {
  const card = CARDS.find((c) => c.id === id)!;
  const fid = useId();
  return (
    <div className={`info-card tone-${card.tone} size-${size}`}>
      <svg viewBox="0 0 100 150" className="info-card-svg" aria-hidden="true">
        <defs>
          <filter id={fid}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <rect x="0" y="0" width="100" height="150" rx="5" className="card-bg" />
        <rect x="0" y="0" width="100" height="150" rx="5" filter={`url(#${fid})`} opacity="0.35" />
        <rect x="4" y="4" width="92" height="142" rx="3" className="card-frame" />
        {[
          [7, 7, 0],
          [93, 7, 90],
          [93, 143, 180],
          [7, 143, 270],
        ].map(([x, y, r]) => (
          <path key={r} transform={`translate(${x} ${y}) rotate(${r})`} d="M 0 10 Q 0 0 10 0 M 3 13 Q 3 3 13 3 M 4 4 m -1.4 0 a 1.4 1.4 0 1 0 2.8 0 a 1.4 1.4 0 1 0 -2.8 0" className="card-curl" />
        ))}
        <g className="card-art">
          <Art id={id} />
        </g>
      </svg>
      <span className="info-card-title">{card.title}</span>
    </div>
  );
});

// ---------------------------------------------------------------- signs

export const SIGNS: { id: string; label: string }[] = [
  { id: 'gotIt', label: 'Got it' },
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'good', label: 'Good' },
  { id: 'evil', label: 'Evil' },
];

export function signLabel(sign: string): string {
  const s = SIGNS.find((x) => x.id === sign);
  if (s) return s.label;
  const n = Number(sign.slice(1));
  return ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][n] ?? String(n);
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [32, 32],
    [68, 68],
  ],
  3: [
    [30, 30],
    [50, 50],
    [70, 70],
  ],
  4: [
    [32, 32],
    [68, 32],
    [32, 68],
    [68, 68],
  ],
  5: [
    [30, 30],
    [70, 30],
    [50, 50],
    [30, 70],
    [70, 70],
  ],
  6: [
    [32, 28],
    [68, 28],
    [32, 50],
    [68, 50],
    [32, 72],
    [68, 72],
  ],
};

export function SignGlyph({ sign }: { sign: string }) {
  if (sign === 'good' || sign === 'evil') {
    return <img className={`sign-mask ${sign}`} src={genericIcon(sign)} alt="" />;
  }
  if (/^n\d+$/.test(sign)) {
    const n = Number(sign.slice(1));
    return (
      <svg viewBox="0 0 100 100" className="sign-svg">
        <rect x="8" y="8" width="84" height="84" rx="18" className="die" />
        {n === 0 ? null : n <= 6 ? (
          PIPS[n].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" className="pip" />)
        ) : (
          <text x="50" y="66" textAnchor="middle" className="die-num">
            {n}
          </text>
        )}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="sign-svg sign-line">
      {sign === 'gotIt' && (
        <path
          d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 7a2 2 0 0 1-1.9 1.4H7V10l4.3-7.6A1.9 1.9 0 0 1 15 5.9Z M3 10h4v11H3z"
          fill="none"
        />
      )}
      {sign === 'yes' && (
        <>
          <circle cx="12" cy="12" r="10" fill="none" />
          <path d="m7 12.5 3.2 3.2L17 9" fill="none" />
        </>
      )}
      {sign === 'no' && (
        <>
          <circle cx="12" cy="12" r="10" fill="none" />
          <path d="m8.5 8.5 7 7M15.5 8.5l-7 7" fill="none" />
        </>
      )}
    </svg>
  );
}
