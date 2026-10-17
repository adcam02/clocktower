import { editionLogo } from '../data';
import { useClient } from '../net/client';
import { useHostNet } from '../net/host';
import { hostGame, st } from '../state/host';
import { evilInfoStatus } from '../lib/evilInfo';
import { ui, useUI, type Panel } from '../state/ui';
import { useView } from '../state/view';
import { Icon, type IconName } from './Icon';
import { HallButton } from './TownHall';

function ToolButton({ icon, label, onClick, active, badge }: { icon: IconName; label: string; onClick: () => void; active?: boolean; badge?: number }) {
  return (
    <button className={`tool ${active ? 'on' : ''}`} onClick={onClick} title={label}>
      <Icon name={icon} />
      <span>{label}</span>
      {badge ? <i className="tool-badge">{badge}</i> : null}
    </button>
  );
}

export function ScriptCrest() {
  const view = useView();
  const s = view.script;
  const logo = s.logo || editionLogo(s.id);
  return (
    <button className="crest" onClick={() => ui.togglePanel('reference')} title="Open the character sheet">
      <img src={logo} alt="" onError={(e) => ((e.target as HTMLImageElement).src = editionLogo('custom'))} />
      <span className="crest-text">
        <strong>{s.name}</strong>
        {s.author && <em>by {s.author}</em>}
      </span>
    </button>
  );
}

function PhaseSwitch() {
  const view = useView();
  const night = view.phase === 'night';
  return (
    <div className={`phase-switch ${night ? 'is-night' : 'is-day'}`} role="group" aria-label="Day or night">
      <span className="phase-thumb" />
      <button className={night ? 'on' : ''} onClick={() => st.setPhase('night')}>
        <Icon name="moon" /> Night
      </button>
      <button
        className={!night ? 'on' : ''}
        onClick={() => (night && evilInfoStatus(hostGame()).missing ? ui.open({ kind: 'dawnCheck' }) : st.setPhase('day'))}
      >
        <Icon name="sun" /> Day
      </button>
    </div>
  );
}

function RoomChip() {
  const view = useView();
  const net = useHostNet();
  const online = view.seats.filter((s) => s.connected).length;
  const ok = net.status === 'open';
  return (
    <button className={`room-chip ${ok ? 'ok' : 'warn'}`} onClick={() => ui.open({ kind: 'share' })} title={net.detail || 'Invite players'}>
      <span className="dot" />
      <span className="room-code">{view.room}</span>
      <span className="room-online">{ok ? `${online} online` : net.status === 'starting' ? 'Opening…' : `${online} online · backup route`}</span>
      <Icon name="link" />
    </button>
  );
}

export function TopBar() {
  const view = useView();
  const panel = useUI((s) => s.panel);
  const hide = useUI((s) => s.hideGrimoire);
  const muted = useUI((s) => s.muted);
  const status = useClient((s) => s.status);
  const isST = view.mode === 'st';
  const toggle = (p: Exclude<Panel, null>) => () => ui.togglePanel(p);
  const awake = Object.values(view.seats).filter((s) => s.awake).length;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <ScriptCrest />
        {isST && <RoomChip />}
        {!isST && status !== 'open' && (
          <span className="room-chip warn">
            <span className="dot" />
            {status === 'waiting' ? 'Waiting for the Storyteller…' : 'Reconnecting…'}
          </span>
        )}
      </div>
      {isST && <PhaseSwitch />}
      {isST && (
        <nav className="topbar-tools">
          <ToolButton icon="scroll" label="Night order" active={panel === 'night'} onClick={toggle('night')} />
          <ToolButton icon="bag" label="Bag" onClick={() => ui.open({ kind: 'bag' })} />
          <ToolButton icon="wake" label="Wake" badge={awake} onClick={() => ui.wake(useUI.getState().draft.to)} />
          <HallButton />
          <ToolButton icon="book" label="Characters" active={panel === 'reference'} onClick={toggle('reference')} />
          <ToolButton icon="vote" label="Votes" active={panel === 'history'} onClick={toggle('history')} />
          <ToolButton
            icon={hide ? 'eyeOff' : 'eye'}
            label={hide ? 'Show grimoire' : 'Hide grimoire'}
            active={hide}
            onClick={() => useUI.setState({ hideGrimoire: !hide })}
          />
          <ToolButton icon={muted ? 'mute' : 'volume'} label={muted ? 'Sound off' : 'Sound on'} onClick={() => useUI.setState({ muted: !muted })} />
          <ToolButton icon="cog" label="Game" onClick={() => ui.open({ kind: 'settings' })} />
        </nav>
      )}
    </header>
  );
}
