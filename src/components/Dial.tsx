import { CORE_TEAMS, composition, genericIcon, TEAM_LABEL, TEAM_SINGULAR } from '../data';

/** What each kind of character is, for people new to the game. */
const TEAM_HINT: Record<string, string> = {
  townsfolk: 'good players with helpful abilities',
  outsider: 'good players whose abilities get in the way',
  minion: 'evil players who help the Demon',
  demon: 'the evil killer. Good wins by executing them',
};
import { majorityOf, st } from '../state/host';
import { useView, type View } from '../state/view';
import { Icon } from './Icon';
import { blockOutlook } from '../lib/block';
import type { Geometry } from './Square';

const NUMERALS = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

function DialFace({ numerals }: { numerals: boolean }) {
  return (
    <svg className="dial-face" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="dial-fill" cx="0.5" cy="0.42">
          <stop offset="0" stopColor="#141726" stopOpacity="0.82" />
          <stop offset="0.75" stopColor="#090a12" stopOpacity="0.88" />
          <stop offset="1" stopColor="#050509" stopOpacity="0.92" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#dial-fill)" />
      <circle cx="100" cy="100" r="98" className="ring outer" />
      <circle cx="100" cy="100" r="95.5" className="ring" />
      {Array.from({ length: 60 }, (_, i) => (
        <line
          key={i}
          x1="100"
          y1={i % 5 === 0 ? 5 : 5.5}
          x2="100"
          y2={i % 5 === 0 ? 9.5 : 7.5}
          className={i % 5 === 0 ? 'tick major' : 'tick'}
          transform={`rotate(${i * 6} 100 100)`}
        />
      ))}
      {numerals &&
        NUMERALS.map((n, i) => {
          const a = ((i * 30 - 90) * Math.PI) / 180;
          return (
            <text key={n} x={100 + Math.cos(a) * 87.5} y={100 + Math.sin(a) * 87.5 + 2.6} className="numeral" textAnchor="middle">
              {n}
            </text>
          );
        })}
      <circle cx="100" cy="100" r={numerals ? 81 : 89} className="ring inner" />
    </svg>
  );
}

function countVotes(view: View) {
  const n = view.nomination!;
  const live = n.status === 'idle' || n.status === 'countdown';
  return live ? n.votes.length : n.votes.filter((v) => n.locked.includes(v)).length;
}

function verdict(view: View, votes: number, majority: number): { text: string; tone: 'kill' | 'safe' | 'tie' } {
  const n = view.nomination!;
  const name = view.seats.find((s) => s.id === n.nomineeId)?.label ?? 'They';
  const marked = view.marked && view.marked.seatId !== n.nomineeId ? view.marked : null;
  const markedName = marked && view.seats.find((s) => s.id === marked.seatId)?.label;
  if (votes < majority) return { text: `Not enough votes. ${name} is safe.`, tone: 'safe' };
  if (marked && votes === marked.votes) return { text: `Tied with ${markedName}. Nobody is about to die.`, tone: 'tie' };
  if (marked && votes < marked.votes) return { text: `Not enough to beat ${markedName}’s ${marked.votes}.`, tone: 'safe' };
  return { text: `${name} is about to die.`, tone: 'kill' };
}

function Nomination() {
  const view = useView();
  const n = view.nomination!;
  const isST = view.mode === 'st';
  const name = (id: string | null) => (id ? view.seats.find((s) => s.id === id)?.label ?? 'Someone' : 'The Storyteller');
  const majority = majorityOf(view.seats);
  const votes = countVotes(view);
  const done = n.status === 'done';
  const v = done ? verdict(view, votes, majority) : null;
  const onBlock = view.marked && view.marked.seatId !== n.nomineeId ? view.seats.find((s) => s.id === view.marked!.seatId) : null;
  const outlook = onBlock ? blockOutlook(view) : null;
  const blockLine =
    onBlock && outlook
      ? outlook.state === 'open'
        ? { state: 'open', text: `To replace ${onBlock.label}: ${outlook.beat} votes${outlook.tie ? `. ${outlook.tie} ties and saves both.` : ''}` }
        : outlook.state === 'tie-only'
          ? { state: 'tie-only', text: `${onBlock.label} can only be tied now: ${outlook.tie} votes saves both.` }
          : { state: 'locked', text: `${onBlock.label}’s execution can’t be stopped by this vote.` }
      : null;
  const handOn = n.step === 0 ? n.nomineeId : n.order[n.step - 1];

  return (
    <div className="nomination">
      {n.status === 'countdown' && (
        <div className="countdown" key={n.countdown}>
          {n.countdown}
        </div>
      )}
      <div className="nom-title">
        {n.nominatorId ? (
          <>
            <b className="sapphire">{name(n.nominatorId)}</b> nominated <b className="blood">{name(n.nomineeId)}</b>
          </>
        ) : (
          <>
            <b className="blood">{name(n.nomineeId)}</b> is up for execution
          </>
        )}
      </div>
      <div className="nom-count">
        <span className="nom-votes">{votes}</span>
        <span>
          {votes === 1 ? 'vote' : 'votes'} in favour <span className="nom-majority">· majority is {majority}</span>
        </span>
      </div>
      {!done && blockLine && <div className={`nom-block ${blockLine.state}`}>{blockLine.text}</div>}
      {n.status === 'running' && <div className="nom-status">{n.step === 0 ? 'The hand is about to move…' : `The hand is on ${name(handOn)}`}</div>}
      {n.status === 'paused' && <div className="nom-status">Voting paused</div>}
      {n.status === 'idle' && !isST && <div className="nom-status">Raise your hand to vote. Voting starts soon.</div>}
      {v && <div className={`nom-verdict ${v.tone}`}>{v.text}</div>}

      {isST && (
        <div className="nom-controls">
          <div className="nom-row">
            {(n.status === 'idle' || n.status === 'paused') && (
              <>
                {n.status === 'idle' && (
                  <button className="btn sapphire small" onClick={st.countdown}>
                    Countdown
                  </button>
                )}
                <button className="btn small" onClick={st.startVote}>
                  {n.status === 'paused' ? 'Resume' : 'Start'}
                </button>
              </>
            )}
            {(n.status === 'running' || n.status === 'countdown') && (
              <button className="btn sapphire small" onClick={st.pauseVote}>
                Pause
              </button>
            )}
            {n.status !== 'idle' && (
              <button className="btn small" onClick={st.resetVote}>
                Reset
              </button>
            )}
            <button className="btn blood small" onClick={st.closeNomination}>
              Close
            </button>
          </div>
          {!done && (
            <div className="nom-row nom-speed">
              <span>Time per player</span>
              <button className="btn small square quiet" aria-label="Less time" onClick={() => st.setSecondsPerPlayer(n.secondsPerPlayer - 1)}>
                <Icon name="minus" />
              </button>
              <b>{n.secondsPerPlayer}s</b>
              <button className="btn small square quiet" aria-label="More time" onClick={() => st.setSecondsPerPlayer(n.secondsPerPlayer + 1)}>
                <Icon name="plus" />
              </button>
            </div>
          )}
          <div className="nom-row">
            <button className={`btn small ${v?.tone === 'kill' ? 'primary' : ''}`} onClick={() => st.markSeat(n.nomineeId, votes)}>
              <Icon name="axe" /> Mark for execution
            </button>
            {view.marked && (
              <button className="btn small quiet" onClick={st.clearMark}>
                Clear mark
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stats() {
  const view = useView();
  const seats = view.seats;
  const travellers = seats.filter((s) => s.traveller).length;
  const players = seats.length - travellers;
  const alive = seats.filter((s) => !s.dead).length;
  const votes = seats.filter((s) => !s.dead || s.ghostVote).length;
  const comp = composition(players);
  const marked = view.marked && seats.find((s) => s.id === view.marked!.seatId);
  const outlook = blockOutlook(view);

  return (
    <div className="stats">
      <div className="dial-phase" key={`${view.phase}${view.day}`}>
        {view.phase === 'night' ? 'Night' : 'Day'} {view.day}
      </div>
      <div className="dial-numbers">
        <div>
          <b>{seats.length}</b>
          <span>players</span>
        </div>
        <div>
          <b>{alive}</b>
          <span>alive</span>
        </div>
        <div>
          <b>{votes}</b>
          <span>votes</span>
        </div>
      </div>
      {comp ? (
        <div className="dial-comp">
          {(['good', 'evil'] as const).map((side) => (
            <div key={side} className={`comp-side ${side}`}>
              <span className="comp-side-label">{side === 'good' ? 'Good' : 'Evil'}</span>
              <div className="comp-teams">
                {CORE_TEAMS.filter((t) => (side === 'good') === (t === 'townsfolk' || t === 'outsider')).map((team) => {
                  const n = comp[team as keyof typeof comp];
                  return (
                    <span key={team} className={`comp comp-${team}`} title={`${n} ${n === 1 ? TEAM_SINGULAR[team] : TEAM_LABEL[team]}: ${TEAM_HINT[team]}`}>
                      <img src={genericIcon(team)} alt="" />
                      <b>{n}</b>
                      <small>{n === 1 ? TEAM_SINGULAR[team] : TEAM_LABEL[team]}</small>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {travellers > 0 && (
            <span className="comp comp-traveller" title="Travellers join part-way through and their characters are public">
              <img src={genericIcon('traveller')} alt="" />
              <b>+{travellers}</b>
              <small>{travellers === 1 ? 'Traveller' : 'Travellers'}</small>
            </span>
          )}
        </div>
      ) : (
        <div className="dial-comp">
          <span className="comp-note">Needs 5 to 20 players</span>
        </div>
      )}
      {marked && (
        <div className={`dial-block ${outlook?.state ?? ''}`}>
          <span>
            <Icon name="axe" /> {marked.label} is on the block · {view.marked!.votes}
          </span>
          {outlook && <small>{outlook.text}</small>}
        </div>
      )}
    </div>
  );
}

export function Dial({ geo }: { geo: Geometry }) {
  const view = useView();
  return (
    <>
      <div className="dial" style={{ left: geo.cx, top: geo.cy, '--d': `${geo.dial}px` } as React.CSSProperties}>
        <DialFace numerals={geo.dial >= 250} />
      </div>
      <div className={`dial-content ${geo.dial >= 250 ? 'roomy' : 'snug'}`} style={{ left: geo.cx, top: geo.cy, '--d': `${geo.dial}px` } as React.CSSProperties}>
        {view.nomination ? <Nomination /> : <Stats />}
      </div>
    </>
  );
}
