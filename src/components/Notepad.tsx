import { useEffect, useState } from 'react';
import { loadJSON, saveJSON } from '../lib/util';
import { useClient } from '../net/client';
import { useView } from '../state/view';
import { PanelView } from './PanelView';

/** A player's private scribbles. They stay in this browser and never go to anyone else. */
export function Notepad() {
  const view = useView();
  const key = `clocktower:notepad:${view.room}`;
  const [text, setText] = useState(() => loadJSON<string>(key, ''));
  useEffect(() => {
    const t = setTimeout(() => saveJSON(key, text), 300);
    return () => clearTimeout(t);
  }, [key, text]);
  return (
    <div className="notepad">
      <p className="notepad-hint">Only you can see this. It’s kept in this browser.</p>
      <textarea
        className="notepad-paper"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Claims, who said what, your theories…"
        spellCheck
        autoFocus
      />
    </div>
  );
}

/** Everything the Storyteller has shown this player, newest first. */
export function Journal() {
  const priv = useClient((s) => s.priv);
  const log = [...(priv?.log ?? [])].reverse();
  const replies = priv?.replies ?? [];
  if (!log.length) return <p className="char-empty">Nothing yet. Whenever the Storyteller wakes you, what they show you is kept here.</p>;
  return (
    <ol className="journal">
      {log.map((w) => (
        <li key={w.id}>
          <span className="eyebrow">{w.when}</span>
          <PanelView message={w} compact reply={replies.find((r) => r.wakeId === w.id)} seatFor={priv?.seatId} />
        </li>
      ))}
    </ol>
  );
}
