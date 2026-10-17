import { useRef } from 'react';
import { useView } from '../state/view';
import type { Geometry } from './Square';

/** An antique spade-style clock hand pointing straight up from the origin. */
function handPath(L: number) {
  const s = L - 46; // where the spade starts
  const solid = [
    `M -2.2 14 L -2.2 ${-s + 2} L 2.2 ${-s + 2} L 2.2 14 Z`,
    `M 0 ${-s + 6} C 14 ${-s - 4} 15 ${-s - 26} 0 ${-L + 10} C -15 ${-s - 26} -14 ${-s - 4} 0 ${-s + 6} Z`,
    `M -1.6 ${-L + 12} L 0 ${-L} L 1.6 ${-L + 12} Z`,
    `M -5.5 ${-s * 0.42 - 3} L 5.5 ${-s * 0.42 - 3} L 3 ${-s * 0.42 + 3} L -3 ${-s * 0.42 + 3} Z`,
    `M -8.5 21 a 8.5 8.5 0 1 0 17 0 a 8.5 8.5 0 1 0 -17 0 Z`,
  ].join(' ');
  const holes = [
    `M 0 ${-s - 5} C 6 ${-s - 10} 6 ${-s - 18} 0 ${-s - 24} C -6 ${-s - 18} -6 ${-s - 10} 0 ${-s - 5} Z`,
    `M -3.6 21 a 3.6 3.6 0 1 0 7.2 0 a 3.6 3.6 0 1 0 -7.2 0 Z`,
  ].join(' ');
  return { solid, holes };
}

function Hand({ L }: { L: number }) {
  const { solid, holes } = handPath(L);
  return (
    <>
      <path d={solid} className="hand-body" />
      <path d={holes} className="hand-hole" />
    </>
  );
}

function useUnwrapped(target: number | null, forwardOnly = false) {
  const last = useRef<number | null>(null);
  if (target === null) {
    last.current = null;
    return null;
  }
  if (last.current === null) {
    last.current = target;
    return target;
  }
  let delta = ((target - last.current) % 360 + 540) % 360 - 180;
  if (forwardOnly && delta < -1) delta += 360;
  last.current = last.current + delta;
  return last.current;
}

export function VoteHands({ geo }: { geo: Geometry }) {
  const view = useView();
  const n = view.nomination;
  const idx = (id: string | null | undefined) => (id ? view.seats.findIndex((s) => s.id === id) : -1);
  const angle = (id: string | null | undefined) => {
    const i = idx(id);
    if (i < 0 || !geo.pts[i]) return null;
    const p = geo.pts[i];
    return (Math.atan2(p.y - geo.cy, p.x - geo.cx) * 180) / Math.PI + 90;
  };
  const voting = n && n.status !== 'idle';
  const handSeat = n ? (n.step === 0 ? n.nomineeId : n.order[n.step - 1]) : null;

  const aNominator = useUnwrapped(n ? angle(n.nominatorId) : null);
  const aNominee = useUnwrapped(n ? angle(n.nomineeId) : null);
  const aVote = useUnwrapped(voting ? angle(handSeat) : null, true);

  if (!n) return null;
  const L = Math.max(70, Math.min(geo.rx, geo.ry) - geo.t * 0.62);

  return (
    <svg className="vote-hands" width={geo.w} height={geo.h} aria-hidden="true">
      <defs>
        <filter id="hand-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.7" />
        </filter>
      </defs>
      <g transform={`translate(${geo.cx} ${geo.cy})`} filter="url(#hand-shadow)">
        {aNominator !== null && (
          <g className="hand hand-nominator" style={{ transform: `rotate(${aNominator}deg)` }}>
            <Hand L={L} />
          </g>
        )}
        {aNominee !== null && (
          <g className="hand hand-nominee" style={{ transform: `rotate(${aNominee}deg)` }}>
            <Hand L={L} />
          </g>
        )}
        {aVote !== null && (
          <g
            className="hand hand-vote"
            style={{ transform: `rotate(${aVote}deg)`, transitionDuration: `${Math.min(0.9, n.secondsPerPlayer * 0.45)}s` }}
          >
            <Hand L={L * 0.92} />
          </g>
        )}
        <circle r="7" className="hand-pin" />
      </g>
    </svg>
  );
}
