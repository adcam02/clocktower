import { useRef, useState } from 'react';
import { EDITIONS, editionLogo, editionScript, getRole, parseScript, type Script } from '../data';
import { loadJSON, saveJSON } from '../lib/util';
import { st, useHost } from '../state/host';
import { ui } from '../state/ui';
import { Icon } from './Icon';
import { Modal } from './Modal';

const RECENT = 'clocktower:recent-scripts';

function counts(script: Script) {
  const custom = new Map((script.custom ?? []).map((r) => [r.id, r]));
  const t: Record<string, number> = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
  for (const id of script.roles) {
    const r = custom.get(id) ?? getRole(id);
    if (r && r.team in t) t[r.team] += 1;
  }
  return `${t.townsfolk} Townsfolk · ${t.outsider} Outsiders · ${t.minion} Minions · ${t.demon} Demons`;
}

export function ScriptModal() {
  const current = useHost((s) => s.g.script);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<Script | null>(null);
  const [recent, setRecent] = useState<Script[]>(() => loadJSON(RECENT, []));
  const file = useRef<HTMLInputElement>(null);

  const use = (script: Script) => {
    st.setScript(script);
    if (!['tb', 'bmr', 'snv'].includes(script.id)) {
      const next = [script, ...recent.filter((r) => r.id !== script.id)].slice(0, 6);
      saveJSON(RECENT, next);
      setRecent(next);
    }
    ui.close();
  };

  const read = (raw: string) => {
    setText(raw);
    if (!raw.trim()) {
      setError('');
      setParsed(null);
      return;
    }
    try {
      setParsed(parseScript(raw));
      setError('');
    } catch (e) {
      setParsed(null);
      setError((e as Error).message);
    }
  };

  return (
    <Modal title="Choose a script" eyebrow={`Now playing ${current.name}`} size="lg">
      <div className="editions">
        {EDITIONS.map((ed) => {
          const script = editionScript(ed.id);
          return (
            <button key={ed.id} className={`edition ${current.id === ed.id ? 'on' : ''}`} onClick={() => use(script)}>
              <img src={editionLogo(ed.id)} alt="" />
              <strong>{ed.name}</strong>
              <p>{ed.blurb}</p>
              <span>{counts(script)}</span>
            </button>
          );
        })}
      </div>

      {recent.length > 0 && (
        <section className="recent-scripts">
          <h3 className="eyebrow">Your custom scripts</h3>
          <div className="recent-list">
            {recent.map((s) => (
              <button key={s.id} className={`recent ${current.id === s.id ? 'on' : ''}`} onClick={() => use(s)}>
                <strong>{s.name}</strong>
                <span>
                  {s.author ? `by ${s.author} · ` : ''}
                  {s.roles.length} characters
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="custom-script">
        <h3 className="eyebrow">Custom script</h3>
        <p>
          Paste the JSON from the official script tool (script.bloodontheclocktower.com) or any homebrew script, or load the file.
        </p>
        <textarea className="input" value={text} onChange={(e) => read(e.target.value)} placeholder='[{"id":"_meta","name":"My Script"},"washerwoman","librarian", …]' />
        <div className="custom-row">
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) read(await f.text());
            }}
          />
          <button className="btn" onClick={() => file.current?.click()}>
            <Icon name="scroll" /> Load a file
          </button>
          {error && <span className="error">{error}</span>}
          {parsed && (
            <>
              <span className="parsed">
                <b>{parsed.name}</b> · {counts(parsed)}
              </span>
              <button className="btn primary" onClick={() => use(parsed)}>
                Use this script
              </button>
            </>
          )}
        </div>
      </section>
    </Modal>
  );
}
