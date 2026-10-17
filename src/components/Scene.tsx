import { memo, useMemo } from 'react';
import type { Phase } from '../state/types';

/** Deterministic random numbers, so the town looks the same on every screen. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
  lit: boolean;
  flicker: boolean;
}

interface Layer {
  d: string;
  windows: Win[];
}

const GROUND = 900;

function building(r: () => number, x: number, w: number, h: number, windows: Win[], litChance: number): string {
  const top = GROUND - h;
  const kind = r();
  let roof: string;
  if (kind < 0.42) roof = `L${x + w / 2} ${top - w * (0.38 + r() * 0.25)} `;
  else if (kind < 0.62) roof = `L${x + w / 2} ${top - w * (0.75 + r() * 0.35)} `;
  else if (kind < 0.85) roof = `L${x + w * 0.22} ${top - w * 0.32} L${x + w * 0.78} ${top - w * 0.32} `;
  else roof = `L${x} ${top - 6} L${x + w} ${top - 6} `;
  let d = `M${x - 2} ${GROUND} L${x - 2} ${top} L${x} ${top} ${roof}L${x + w} ${top} L${x + w + 2} ${top} L${x + w + 2} ${GROUND} Z `;
  if (r() < 0.55) {
    const cx = x + w * (0.62 + r() * 0.2);
    const ch = 16 + r() * 18;
    d += `M${cx} ${top - 4} L${cx} ${top - w * 0.2 - ch} L${cx + 9} ${top - w * 0.2 - ch} L${cx + 9} ${top - 4} Z `;
  }
  const cols = Math.max(1, Math.floor(w / 24));
  const rows = Math.max(1, Math.floor((h - 18) / 34));
  for (let c = 0; c < cols; c++) {
    for (let rr = 0; rr < rows; rr++) {
      if (r() > 0.5) continue;
      const wx = x + (w / cols) * (c + 0.5) - 4;
      const wy = top + 14 + rr * 34;
      windows.push({ x: wx, y: wy, w: 8, h: 12, lit: r() < litChance, flicker: r() < 0.08 });
    }
  }
  return d;
}

function skyline(seed: number, from: number, to: number, minH: number, maxH: number, gap: number, litChance: number): Layer {
  const r = rng(seed);
  const windows: Win[] = [];
  let d = '';
  let x = from;
  while (x < to) {
    const w = 46 + r() * 70;
    const h = minH + r() * (maxH - minH);
    d += building(r, x, w, h, windows, litChance);
    x += w + r() * gap;
  }
  return { d, windows };
}

function trees(seed: number, spots: [number, number][]): string {
  const r = rng(seed);
  let d = '';
  for (const [x, size] of spots) {
    const blobs = 5 + Math.floor(r() * 4);
    for (let i = 0; i < blobs; i++) {
      const bx = x + (r() - 0.5) * size;
      const by = GROUND - size * 0.6 - r() * size * 0.7;
      const br = size * (0.28 + r() * 0.22);
      d += `M${bx - br} ${by} a${br} ${br} 0 1 0 ${br * 2} 0 a${br} ${br} 0 1 0 ${-br * 2} 0 Z `;
    }
    d += `M${x - 5} ${GROUND} L${x - 3} ${GROUND - size * 0.6} L${x + 3} ${GROUND - size * 0.6} L${x + 5} ${GROUND} Z `;
  }
  return d;
}

function stars(seed: number, n: number) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({
    x: r() * 1600,
    y: r() * 560,
    s: r() < 0.08 ? 1.6 + r() : 0.5 + r() * 0.9,
    g: Math.floor(r() * 3),
  }));
}

function clouds(seed: number) {
  const r = rng(seed);
  return Array.from({ length: 7 }, (_, i) => ({
    y: 70 + r() * 330,
    scale: 0.6 + r() * 0.9,
    duration: 180 + r() * 200,
    delay: -r() * 380,
    puffs: Array.from({ length: 5 + Math.floor(r() * 3) }, () => ({
      cx: (r() - 0.5) * 260,
      cy: (r() - 0.5) * 34,
      rx: 60 + r() * 80,
      ry: 18 + r() * 22,
    })),
    key: i,
  }));
}

const TOWER_X = 1270;
const TOWER_W = 92;
const TOWER_TOP = 300;

function clocktower(): string {
  const x = TOWER_X - TOWER_W / 2;
  const belfry = TOWER_TOP;
  let d = `M${x} ${GROUND} L${x} ${belfry + 40} L${x - 8} ${belfry + 40} L${x - 8} ${belfry + 26} L${x + TOWER_W + 8} ${belfry + 26} L${x + TOWER_W + 8} ${belfry + 40} L${x + TOWER_W} ${belfry + 40} L${x + TOWER_W} ${GROUND} Z `;
  // Belfry with arches, then the spire.
  d += `M${x + 6} ${belfry + 26} L${x + 6} ${belfry - 40} L${x + TOWER_W - 6} ${belfry - 40} L${x + TOWER_W - 6} ${belfry + 26} Z `;
  d += `M${x - 4} ${belfry - 40} L${TOWER_X} ${belfry - 200} L${x + TOWER_W + 4} ${belfry - 40} Z `;
  d += `M${TOWER_X - 1.5} ${belfry - 200} L${TOWER_X - 1.5} ${belfry - 236} L${TOWER_X + 1.5} ${belfry - 236} L${TOWER_X + 1.5} ${belfry - 200} Z `;
  // Corner pinnacles.
  for (const px of [x - 8, x + TOWER_W + 2]) d += `M${px} ${belfry + 26} L${px + 3} ${belfry - 8} L${px + 6} ${belfry + 26} Z `;
  return d;
}

function church(): string {
  const x = 330;
  const w = 150;
  const top = GROUND - 210;
  let d = `M${x} ${GROUND} L${x} ${top} L${x + w / 2} ${top - 70} L${x + w} ${top} L${x + w} ${GROUND} Z `;
  const sx = x + w - 10;
  d += `M${sx} ${GROUND} L${sx} ${top - 60} L${sx + 48} ${top - 60} L${sx + 48} ${GROUND} Z `;
  d += `M${sx - 4} ${top - 60} L${sx + 24} ${top - 250} L${sx + 52} ${top - 60} Z `;
  d += `M${sx + 22.5} ${top - 250} L${sx + 22.5} ${top - 282} L${sx + 25.5} ${top - 282} L${sx + 25.5} ${top - 250} Z M${sx + 15} ${top - 272} L${sx + 33} ${top - 272} L${sx + 33} ${top - 268} L${sx + 15} ${top - 268} Z `;
  return d;
}

function Windows({ list, className }: { list: Win[]; className: string }) {
  return (
    <g className={className}>
      {list.map((w, i) => (
        <rect
          key={i}
          x={w.x}
          y={w.y}
          width={w.w}
          height={w.h}
          rx={w.w / 2}
          className={`${w.lit ? 'lit' : 'dark'}${w.flicker ? ' flicker' : ''}`}
          style={{ transitionDelay: `${(i % 17) * 90}ms` }}
        />
      ))}
    </g>
  );
}

export const Scene = memo(function Scene({ phase }: { phase: Phase | 'dusk' }) {
  const geo = useMemo(() => {
    const far = skyline(11, -40, 1660, 80, 190, 10, 0.25);
    const mid = skyline(23, -60, 1680, 50, 150, 40, 0.4);
    const nearLeft = skyline(37, -40, 400, 110, 230, 6, 0.55);
    const nearRight = skyline(41, 1240, 1660, 110, 230, 6, 0.55);
    // Low cottages along the bottom, so the town doesn't stop dead either side of the square.
    const nearMid = skyline(53, 380, 1260, 34, 86, 18, 0.45);
    return {
      far,
      mid,
      near: { d: nearLeft.d + nearMid.d + nearRight.d, windows: [...nearLeft.windows, ...nearMid.windows, ...nearRight.windows] },
      tower: clocktower(),
      church: church(),
      trees: trees(5, [
        [430, 120],
        [560, 90],
        [1040, 110],
        [1180, 80],
        [700, 70],
        [900, 85],
      ]),
      stars: stars(7, 170),
      clouds: clouds(3),
    };
  }, []);

  return (
    <div className={`scene is-${phase}`} aria-hidden="true">
      <svg className="scene-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#03040a" />
            <stop offset="0.45" stopColor="#0a0d1f" />
            <stop offset="0.78" stopColor="#1a1832" />
            <stop offset="1" stopColor="#33233f" />
          </linearGradient>
          <linearGradient id="sky-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3c4b63" />
            <stop offset="0.5" stopColor="#7a8597" />
            <stop offset="0.82" stopColor="#c0ab8a" />
            <stop offset="1" stopColor="#d9ad76" />
          </linearGradient>
          <radialGradient id="moon-glow">
            <stop offset="0" stopColor="#fff4d6" stopOpacity="0.32" />
            <stop offset="0.35" stopColor="#d8d2ff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#d8d2ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moon-face" cx="0.42" cy="0.38">
            <stop offset="0" stopColor="#fffdf2" />
            <stop offset="0.6" stopColor="#ece4c8" />
            <stop offset="1" stopColor="#c9bf9d" />
          </radialGradient>
          <radialGradient id="sun-glow">
            <stop offset="0" stopColor="#fff7e2" stopOpacity="0.85" />
            <stop offset="0.2" stopColor="#ffe9bd" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="clock-glow">
            <stop offset="0" stopColor="#ffcf73" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffcf73" stopOpacity="0" />
          </radialGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
          <filter id="glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>

        <rect className="sky sky-night" width="1600" height="900" fill="url(#sky-night)" />
        <rect className="sky sky-day" width="1600" height="900" fill="url(#sky-day)" />

        <g className="stars">
          {geo.stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.s} className={`star g${s.g}`} />
          ))}
        </g>

        <g className="sun">
          <circle cx="1390" cy="150" r="420" fill="url(#sun-glow)" />
          <circle cx="1390" cy="150" r="46" fill="#fff6e0" opacity="0.85" />
        </g>

        <g className="moon">
          <circle cx="210" cy="150" r="260" fill="url(#moon-glow)" />
          <circle cx="210" cy="150" r="58" fill="url(#moon-face)" />
          <g fill="#b9ae8b" opacity="0.35">
            <circle cx="190" cy="132" r="11" />
            <circle cx="232" cy="168" r="8" />
            <circle cx="214" cy="118" r="5" />
            <circle cx="182" cy="172" r="6" />
            <circle cx="240" cy="136" r="4" />
          </g>
        </g>

        <g className="clouds">
          {geo.clouds.map((c) => (
            <g
              key={c.key}
              className="cloud"
              style={{ animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
            >
              <g transform={`translate(0 ${c.y}) scale(${c.scale})`} filter="url(#soft)">
                {c.puffs.map((p, i) => (
                  <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} />
                ))}
              </g>
            </g>
          ))}
        </g>

        <path className="hills" d="M0 760 C 180 700 320 720 470 690 S 760 640 900 680 S 1180 650 1330 690 S 1520 700 1600 680 L1600 900 L0 900 Z" />

        <path className="layer far" d={geo.far.d + geo.church} />
        <Windows list={geo.far.windows} className="windows far-windows" />

        <g className="tower">
          <path className="layer far" d={geo.tower} />
          <circle className="clock-glow" cx={TOWER_X} cy={TOWER_TOP + 90} r="90" fill="url(#clock-glow)" />
          <circle className="clock-face" cx={TOWER_X} cy={TOWER_TOP + 90} r="30" />
          <circle className="clock-rim" cx={TOWER_X} cy={TOWER_TOP + 90} r="30" />
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              className="clock-tick"
              x1={TOWER_X}
              y1={TOWER_TOP + 90 - 26}
              x2={TOWER_X}
              y2={TOWER_TOP + 90 - (i % 3 === 0 ? 20 : 23)}
              transform={`rotate(${i * 30} ${TOWER_X} ${TOWER_TOP + 90})`}
            />
          ))}
          <g style={{ transformOrigin: `${TOWER_X}px ${TOWER_TOP + 90}px` }} className="clock-hour">
            <line className="clock-hand" x1={TOWER_X} y1={TOWER_TOP + 90} x2={TOWER_X} y2={TOWER_TOP + 74} />
          </g>
          <g style={{ transformOrigin: `${TOWER_X}px ${TOWER_TOP + 90}px` }} className="clock-minute">
            <line className="clock-hand" x1={TOWER_X} y1={TOWER_TOP + 90} x2={TOWER_X} y2={TOWER_TOP + 66} />
          </g>
          {[-22, 0, 22].map((dx) => (
            <path
              key={dx}
              className="belfry-arch"
              d={`M${TOWER_X + dx - 7} ${TOWER_TOP + 18} L${TOWER_X + dx - 7} ${TOWER_TOP - 18} A7 7 0 0 1 ${TOWER_X + dx + 7} ${TOWER_TOP - 18} L${TOWER_X + dx + 7} ${TOWER_TOP + 18} Z`}
            />
          ))}
        </g>

        <path className="layer mid" d={geo.mid.d} />
        <Windows list={geo.mid.windows} className="windows mid-windows" />

        <path className="layer trees" d={geo.trees} />

        <g className="fog">
          <ellipse cx="500" cy="860" rx="700" ry="60" filter="url(#soft)" className="fog-a" />
          <ellipse cx="1200" cy="880" rx="640" ry="55" filter="url(#soft)" className="fog-b" />
        </g>

        <path className="layer near" d={geo.near.d} />
        <Windows list={geo.near.windows} className="windows near-windows" />
        <rect className="ground" x="0" y="884" width="1600" height="16" />
      </svg>
      <div className="scene-shade" />
      <div className="scene-grain" />
    </div>
  );
});
