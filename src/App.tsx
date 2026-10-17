import { useContext, useEffect, useState } from 'react';
import { Scene } from './components/Scene';
import { Square } from './components/Square';
import { TopBar } from './components/TopBar';
import { SidePanel } from './components/SidePanel';
import { Modals } from './components/Modals';
import { Toasts } from './components/Toasts';
import { BluffBar } from './components/BluffBar';
import { PickBanner } from './components/PickBanner';
import { MyCharacter, VoteBar } from './components/PlayerBits';
import { WakeOverlay } from './components/WakeOverlay';
import { TownHallCall } from './components/TownHall';
import { Landing } from './components/Landing';
import { useEffects } from './lib/effects';
import { clientLink, useClient } from './net/client';
import { hostLink } from './net/host';
import { notes } from './state/notes';
import { useUI } from './state/ui';
import { ModeContext, usePlayerView, useStorytellerView, ViewContext } from './state/view';
import { Icon } from './components/Icon';

type Route = { kind: 'landing' } | { kind: 'st' } | { kind: 'player'; room: string };

function readRoute(): Route {
  const p = new URLSearchParams(location.search);
  const room = (p.get('room') ?? p.get('join') ?? '').trim().toUpperCase();
  if (room) return { kind: 'player', room };
  if (p.has('st')) return { kind: 'st' };
  return { kind: 'landing' };
}

export function go(route: Route) {
  const p = new URLSearchParams(location.search);
  p.delete('room');
  p.delete('join');
  p.delete('st');
  if (route.kind === 'player') p.set('room', route.room);
  if (route.kind === 'st') p.set('st', '');
  const q = p.toString().replace(/st=(&|$)/, 'st$1');
  history.pushState(null, '', `${location.pathname}${q ? `?${q}` : ''}`);
  window.dispatchEvent(new Event('popstate'));
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  useEffect(() => {
    const on = () => setRoute(readRoute());
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  if (route.kind === 'st') return <Storyteller />;
  if (route.kind === 'player') return <Player room={route.room} />;
  return <Landing />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const panel = useUI((s) => s.panel);
  const mode = useContext(ModeContext);
  return <div className={`app mode-${mode} ${panel ? 'has-panel' : ''}`}>{children}</div>;
}

function Storyteller() {
  const view = useStorytellerView();
  useEffect(() => {
    hostLink.start(view.room);
  }, [view.room]);
  useEffects(view);
  return (
    <ModeContext.Provider value="st">
      <ViewContext.Provider value={view}>
        <Shell>
          <Scene phase={view.phase} />
          <TopBar />
          <Square />
          <SidePanel />
          <BluffBar />
          <PickBanner />
          <Modals />
          <Toasts />
        </Shell>
      </ViewContext.Provider>
    </ModeContext.Provider>
  );
}

function Player({ room }: { room: string }) {
  useEffect(() => {
    notes.load(room);
    clientLink.start(room);
    document.title = `Room ${room} · The Grimoire`;
  }, [room]);
  const view = usePlayerView();
  const status = useClient((s) => s.status);
  useEffects(view);
  if (!view) {
    return (
      <div className="app">
        <Scene phase="night" />
        <div className="connecting">
          <div className="connecting-card surface">
            <div className="spinner" />
            <h1>Room {room}</h1>
            <p>
              {status === 'waiting'
                ? 'The Storyteller hasn’t opened this room yet. It will appear as soon as they do.'
                : status === 'reconnecting'
                  ? 'Having trouble reaching the lobby. Still trying…'
                  : 'Finding the Storyteller…'}
            </p>
            <button className="btn quiet small" onClick={() => (location.href = location.pathname)}>
              <Icon name="chevronLeft" /> Use a different code
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <ModeContext.Provider value="player">
      <ViewContext.Provider value={view}>
        <Shell>
          <Scene phase={view.phase} />
          <TopBar />
          <Square />
          <SidePanel />
          <MyCharacter />
          <VoteBar />
          <Modals />
          <WakeOverlay />
          <TownHallCall />
          <Toasts />
        </Shell>
      </ViewContext.Provider>
    </ModeContext.Provider>
  );
}
