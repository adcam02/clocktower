import { memo, useId } from 'react';
import { getRole, iconUrl, type Alignment } from '../data';

function fitSize(text: string, base: number, room: number) {
  return Math.min(base, room / Math.max(1, text.length));
}

/** Text that follows the bottom curve of a round token. */
export function ArcText({ text, radius = 38, size = 11, className }: { text: string; radius?: number; size?: number; className?: string }) {
  const id = useId();
  const y = 50;
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id={id} d={`M ${50 - radius} ${y} A ${radius} ${radius} 0 0 0 ${50 + radius} ${y}`} />
      </defs>
      <text fontSize={size} textAnchor="middle">
        <textPath href={`#${id}`} startOffset="50%">
          {text}
        </textPath>
      </text>
    </svg>
  );
}

interface TokenProps {
  roleId: string | null;
  alignment?: Alignment | null;
  dead?: boolean;
  /** Mark death with a small skull on the rim instead of a shroud, so the character stays readable. */
  deadBadge?: boolean;
  /** Show a face-down token when there's no character to show. */
  blank?: 'unknown' | 'empty';
  label?: boolean;
  className?: string;
}

export const Token = memo(function Token({ roleId, alignment, dead, deadBadge, blank = 'unknown', label = true, className = '' }: TokenProps) {
  const role = getRole(roleId);
  if (!role) {
    return (
      <div className={`token face-down ${blank} ${dead ? 'is-dead' : ''} ${className}`}>
        <svg className="emblem" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="27" />
          <circle cx="50" cy="50" r="2.5" className="fill" />
          <path d="M50 50 L50 30" />
          <path d="M50 50 L63 57" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M50 25 L50 28.5" transform={`rotate(${i * 30} 50 50)`} />
          ))}
        </svg>
        {dead && <Shroud />}
      </div>
    );
  }
  const name = role.name;
  return (
    <div className={`token team-${role.team} ${dead ? (deadBadge ? 'is-dead dead-badged' : 'is-dead') : ''} ${className}`}>
      <img className="token-icon" src={iconUrl(role, alignment)} alt="" draggable={false} loading="lazy" />
      {label && <ArcText className="token-name" text={name} size={fitSize(name, 12.5, 118)} />}
      {dead && (deadBadge ? <DeadBadge /> : <Shroud />)}
    </div>
  );
});

function DeadBadge() {
  return (
    <svg className="dead-badge" viewBox="0 0 24 24" aria-label="Dead">
      <circle cx="12" cy="12" r="11.5" />
      <path d="M12 4.6c-3.6 0-5.9 2.5-5.9 5.6 0 1.9.9 3.2 2.3 3.9v2.4h7.2v-2.4c1.4-.7 2.3-2 2.3-3.9 0-3.1-2.3-5.6-5.9-5.6Z" className="dead-skull" />
      <circle cx="9.6" cy="10.4" r="1.45" className="dead-eye" />
      <circle cx="14.4" cy="10.4" r="1.45" className="dead-eye" />
      <path d="M10 16.5v2.2M12 16.5v2.2M14 16.5v2.2" className="dead-teeth" />
    </svg>
  );
}

export function Shroud() {
  return (
    <svg className="shroud" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="shroud-cloth" x1="0" x2="1">
          <stop offset="0" stopColor="#060608" />
          <stop offset="0.45" stopColor="#1d1c24" />
          <stop offset="0.55" stopColor="#141319" />
          <stop offset="1" stopColor="#050506" />
        </linearGradient>
      </defs>
      <path d="M36 -6 L64 -6 L64 40 L50 49 L36 40 Z" fill="url(#shroud-cloth)" />
      <path d="M41 -6 L41 40 M47 -6 L47 45 M53 -6 L53 45 M59 -6 L59 40" stroke="#000" strokeOpacity="0.45" strokeWidth="1" />
      <g transform="translate(50 17) scale(0.72) translate(-50 -33)">
      <g fill="#ece6d6">
        <path d="M50 22 c-7 0 -11 4.6 -11 10.4 c0 3.6 1.7 6 4.4 7.3 V44 h13.2 v-4.3 c2.7-1.3 4.4-3.7 4.4-7.3 C61 26.6 57 22 50 22 Z" />
      </g>
      <g fill="#111">
        <circle cx="45.5" cy="32.5" r="2.6" />
        <circle cx="54.5" cy="32.5" r="2.6" />
        <path d="M50 35.5 l-1.6 3 h3.2 Z" />
        <rect x="46.5" y="41" width="1.3" height="3" />
        <rect x="49.4" y="41" width="1.3" height="3" />
        <rect x="52.2" y="41" width="1.3" height="3" />
      </g>
      </g>
    </svg>
  );
}

export const ReminderToken = memo(function ReminderToken({ roleId, text, className = '' }: { roleId: string; text: string; className?: string }) {
  const role = getRole(roleId);
  return (
    <div className={`reminder ${className}`} title={role ? `${role.name}: ${text}` : text}>
      {role ? <img src={iconUrl(role)} alt="" draggable={false} /> : <span className="reminder-plain">{text.slice(0, 1)}</span>}
      <ArcText className="reminder-text" text={text} radius={36} size={fitSize(text, 17, 178)} />
    </div>
  );
});
