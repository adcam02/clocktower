import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { nightMusic } from '../lib/music';
import { loadJSON, saveJSON } from '../lib/util';
import { command, embedUrl, parseYouTube, thumbnail } from '../lib/youtube';
import { player, useClient } from '../net/client';
import type { NightVideo } from '../state/types';
import { useView } from '../state/view';
import { Icon } from './Icon';

type Choice = 'ask' | 'music' | 'video' | 'none';

interface Lounge {
  choice: Choice;
  night: number;
  big: boolean;
  level: number;
  /** A video this player has just put on, shown straight away while the Storyteller's page shares it. */
  pending: { videoId: string; list?: string; at: number } | null;
}

const useLounge = create<Lounge>(() => ({ choice: 'none', night: 0, big: true, level: loadJSON('clocktower:music-level', 0.6), pending: null }));
const choose = (choice: Choice) => {
  if (choice === 'music') nightMusic.start();
  else nightMusic.stop();
  useLounge.setState({ choice });
};

/** Something to pass the night with: a music box of their own, or a video everyone watches together. */
export function NightLounge() {
  const view = useView();
  const me = view.seats.find((s) => s.isMe);
  const awake = useClient((s) => Boolean(s.priv?.wake));
  const { choice, night, big, level, pending } = useLounge();
  const offset = useClient((s) => s.clockOffset);
  const shared = view.nightVideo;
  // Until the Storyteller's page confirms it, the person who put the video on still sees it.
  const video: NightVideo | null =
    shared ?? (pending && me ? { videoId: pending.videoId, list: pending.list, startedAt: pending.at + offset, by: me.id } : null);
  const [now, setNow] = useState(Date.now());
  const unshared = Boolean(!shared && pending && now - pending.at > 5000);
  useEffect(() => {
    if (!pending || shared) return;
    const t = setTimeout(() => setNow(Date.now()), 5200);
    return () => clearTimeout(t);
  }, [pending, shared]);
  useEffect(() => {
    if (shared && useLounge.getState().pending) useLounge.setState({ pending: null });
  }, [shared]);
  const isNight = view.phase === 'night';
  const seated = Boolean(me);

  // Night falls: offer something to do. Day breaks: everything stops.
  useEffect(() => {
    if (!isNight || !seated) {
      choose('none');
      useLounge.setState({ pending: null });
      return;
    }
    if (useLounge.getState().night !== view.day) {
      useLounge.setState({ night: view.day });
      choose('ask');
    }
  }, [isNight, seated, view.day]);

  // Someone puts a video on: invite everyone who isn't already watching.
  const videoKey = shared ? `${shared.videoId}:${shared.startedAt}` : null;
  useEffect(() => {
    if (videoKey && isNight && seated && useLounge.getState().choice !== 'video') useLounge.setState({ choice: 'ask' });
    if (!videoKey && useLounge.getState().choice === 'video' && !useLounge.getState().pending) useLounge.setState({ choice: 'ask' });
  }, [videoKey, isNight, seated]);

  useEffect(() => nightMusic.duck(awake), [awake]);
  useEffect(() => {
    nightMusic.setLevel(level);
    saveJSON('clocktower:music-level', level);
  }, [level]);

  if (!isNight || !seated || !night) return null;
  const byName = video?.by ? view.seats.find((s) => s.id === video.by)?.label ?? 'Someone' : 'Someone';

  return (
    <>
      {choice === 'ask' && <AskCard video={video} byName={byName} />}
      {choice === 'music' && (
        <div className="lounge-music surface">
          <Icon name="music" />
          <span>Night music</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={level}
            onChange={(e) => useLounge.setState({ level: Number(e.target.value) })}
            aria-label="Music volume"
          />
          {video && (
            <button className="btn small" onClick={() => choose('video')}>
              <Icon name="play" /> Watch along
            </button>
          )}
          <button className="btn small quiet" onClick={() => choose('ask')}>
            Stop
          </button>
        </div>
      )}
      {choice === 'video' && video && <SharedVideo key={video.videoId} video={video} byName={byName} big={big} awake={awake} unshared={unshared} />}
    </>
  );
}

function AskCard({ video, byName }: { video: NightVideo | null; byName: string }) {
  const [linking, setLinking] = useState(false);
  const [link, setLink] = useState(() => loadJSON<string>('clocktower:last-video', ''));
  const [error, setError] = useState('');
  const putOn = () => {
    const parsed = parseYouTube(link);
    if (!parsed) {
      setError('That doesn’t look like a YouTube link.');
      return;
    }
    saveJSON('clocktower:last-video', link);
    useLounge.setState({ pending: { videoId: parsed.videoId, list: parsed.list, at: Date.now() } });
    player.video(parsed.videoId, parsed.list);
    choose('video');
  };
  return (
    <div className="lounge-ask surface" role="dialog" aria-label="Night falls">
      <span className="eyebrow">Close your eyes</span>
      <h2>Night falls</h2>
      <p>Pass the time while you wait. If the Storyteller wakes you, you’ll see it straight away.</p>
      <div className="lounge-options">
        {video && (
          <button className="lounge-option featured" onClick={() => choose('video')}>
            <img src={thumbnail(video.videoId)} alt="" />
            <span>
              <b>Watch along</b>
              <em>{byName} put on a video for everyone</em>
            </span>
          </button>
        )}
        <button className="lounge-option" onClick={() => choose('music')}>
          <span className="lounge-glyph">
            <Icon name="music" />
          </span>
          <span>
            <b>Night music</b>
            <em>A creepy little music box, just for you</em>
          </span>
        </button>
        {linking ? (
          <form
            className="lounge-link"
            onSubmit={(e) => {
              e.preventDefault();
              putOn();
            }}
          >
            <input className="input" value={link} onChange={(e) => (setLink(e.target.value), setError(''))} placeholder="Paste a YouTube link" autoFocus />
            <button className="btn primary" disabled={!link.trim()}>
              Play for everyone
            </button>
            {error && <span className="error">{error}</span>}
          </form>
        ) : (
          <button className="lounge-option" onClick={() => setLinking(true)}>
            <span className="lounge-glyph">
              <Icon name="play" />
            </span>
            <span>
              <b>{video ? 'Put on a different video' : 'Put on a video for everyone'}</b>
              <em>Paste a YouTube link and everyone can watch along</em>
            </span>
          </button>
        )}
      </div>
      <button className="btn quiet" onClick={() => choose('none')}>
        Just wait
      </button>
    </div>
  );
}

function SharedVideo({ video, byName, big, awake, unshared }: { video: NightVideo; byName: string; big: boolean; awake: boolean; unshared: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const elapsed = () => (Date.now() + useClient.getState().clockOffset - video.startedAt) / 1000;
  const [src] = useState(() => embedUrl(video.videoId, elapsed(), video.list));

  // Paused while the Storyteller has you awake; afterwards, catch up with everyone else.
  useEffect(() => {
    if (awake) command(frame.current, 'pauseVideo');
    else {
      command(frame.current, 'seekTo', [elapsed(), true]);
      command(frame.current, 'playVideo');
    }
  }, [awake]);

  return (
    <div className={`lounge-video surface ${big ? 'big' : 'small'}`}>
      <header>
        <Icon name="play" />
        <span>
          <b>{byName}</b> put this on for everyone
        </span>
        <button className="btn small quiet square" title={big ? 'Make it smaller' : 'Make it bigger'} onClick={() => useLounge.setState({ big: !big })}>
          <Icon name={big ? 'shrink' : 'expand'} />
        </button>
        <button
          className="btn small quiet"
          onClick={() => {
            useLounge.setState({ pending: null });
            choose('ask');
          }}
          title="Change video or stop watching"
        >
          <Icon name="x" /> Close
        </button>
      </header>
      {unshared && (
        <p className="lounge-warn">
          Only you can see this. The Storyteller’s page didn’t pass it on, so ask them to refresh their page (their game is saved), then put it on again.
        </p>
      )}
      <div className="lounge-frame">
        <iframe
          ref={frame}
          src={src}
          title="Night video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
