import { useState } from 'react';
import { go } from '../App';
import { loadJSON } from '../lib/util';
import { st } from '../state/host';
import type { GameState } from '../state/types';
import { Icon } from './Icon';
import { Scene } from './Scene';

const BASE = import.meta.env.BASE_URL;

export function Landing() {
  const saved = loadJSON<GameState | null>('clocktower:storyteller', null);
  const [code, setCode] = useState('');
  const clean = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  const named = saved?.seats.filter((s) => s.name).length ?? 0;

  return (
    <div className="app landing">
      <Scene phase="night" />
      <main className="landing-main">
        <header className="landing-head">
          <p className="eyebrow">Blood on the Clocktower, played over Discord</p>
          <h1 className="wordmark">The Grimoire</h1>
        </header>

        <div className="landing-cards">
          <section className="landing-card surface">
            <div className="landing-icon">
              <Icon name="book" />
            </div>
            <h2>Storyteller</h2>
            <p>Set out the seats, fill the bag, deal characters and wake players in the night.</p>
            <div className="landing-actions">
              {saved ? (
                <>
                  <button className="btn primary big" onClick={() => go({ kind: 'st' })}>
                    Return to room {saved.room}
                  </button>
                  <span className="landing-note">
                    {saved.script.name} · {named ? `${named} players` : `${saved.seats.length} seats`} · {saved.phase === 'night' ? 'Night' : 'Day'} {saved.day}
                  </span>
                  <button
                    className="btn quiet small"
                    onClick={() => {
                      st.newRoom();
                      go({ kind: 'st' });
                    }}
                  >
                    Start a fresh room instead
                  </button>
                </>
              ) : (
                <button
                  className="btn primary big"
                  onClick={() => {
                    st.newRoom();
                    go({ kind: 'st' });
                  }}
                >
                  Open a new room
                </button>
              )}
            </div>
          </section>

          <section className="landing-card surface">
            <div className="landing-icon">
              <Icon name="users" />
            </div>
            <h2>Player</h2>
            <p>Your Storyteller’s link brings you straight in. If you only have the room code, type it here.</p>
            <form
              className="landing-actions join"
              onSubmit={(e) => {
                e.preventDefault();
                if (clean.length === 5) go({ kind: 'player', room: clean });
              }}
            >
              <input
                className="input code-input"
                value={clean}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ROOM"
                aria-label="Room code"
                autoCapitalize="characters"
                spellCheck={false}
              />
              <button className="btn big" disabled={clean.length !== 5}>
                Join
              </button>
            </form>
          </section>
        </div>

        <footer className="landing-foot">
          <img src={`${BASE}assets/ccc.png`} alt="Community Created Content" />
          <p>
            An unofficial, non-commercial tool for playing with friends. Blood on the Clocktower and its character art belong to The Pandemonium
            Institute.
          </p>
        </footer>
      </main>
    </div>
  );
}
