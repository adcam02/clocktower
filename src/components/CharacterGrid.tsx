import { useMemo, useState, type ReactNode } from 'react';
import { getRole, rolesByTeam, TEAM_LABEL, TEAMS, type Role, type Team } from '../data';
import { RichText } from './RichText';
import { Token } from './Token';

export interface GridProps {
  ids: string[];
  onPick: (id: string) => void;
  /** Right-click, e.g. to take one copy out of the bag. */
  onSecondary?: (id: string) => void;
  selected?: string[];
  counts?: Record<string, number>;
  dimmed?: Set<string>;
  tags?: Record<string, ReactNode>;
  size?: number;
  teams?: Team[];
  query?: string;
  /** Extra controls shown beside each team heading. */
  teamExtra?: (team: Team, roles: Role[]) => ReactNode;
}

/** Character tokens laid out by team, with the hovered character's ability underneath. */
export function CharacterGrid({ ids, onPick, onSecondary, selected = [], counts, dimmed, tags, size = 72, teams = TEAMS, query = '', teamExtra }: GridProps) {
  const [hover, setHover] = useState<string | null>(null);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? ids.filter((id) => getRole(id)?.name.toLowerCase().includes(q) || getRole(id)?.ability.toLowerCase().includes(q)) : ids;
    return rolesByTeam(filtered);
  }, [ids, query]);
  const hovered = getRole(hover);
  const sel = new Set(selected);

  return (
    <div className="char-grid" style={{ '--tok': `${size}px` } as React.CSSProperties}>
      {teams.map((team) =>
        groups[team].length ? (
          <section key={team} className={`char-team team-${team}`}>
            <h3>
              <span>{TEAM_LABEL[team]}</span>
              {teamExtra?.(team, groups[team])}
            </h3>
            <div className="char-list">
              {groups[team].map((r) => {
                const count = counts?.[r.id] ?? 0;
                return (
                  <button
                    key={r.id}
                    className={`char ${sel.has(r.id) || count > 0 ? 'on' : ''} ${dimmed?.has(r.id) ? 'dim' : ''}`}
                    onClick={() => onPick(r.id)}
                    onContextMenu={(e) => {
                      if (!onSecondary) return;
                      e.preventDefault();
                      onSecondary(r.id);
                    }}
                    onPointerEnter={() => setHover(r.id)}
                    onPointerLeave={() => setHover((h) => (h === r.id ? null : h))}
                    onFocus={() => setHover(r.id)}
                    title={r.name}
                  >
                    <Token roleId={r.id} />
                    {count > 1 && <i className="char-count">×{count}</i>}
                    {tags?.[r.id] && <span className="char-tag">{tags[r.id]}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null,
      )}
      {!TEAMS.some((t) => groups[t].length) && <p className="char-empty">No characters match.</p>}
      <div className={`char-hover ${hovered ? 'show' : ''}`} aria-live="polite">
        {hovered && (
          <>
            <strong>{hovered.name}</strong>
            <span>
              <RichText text={hovered.ability} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
