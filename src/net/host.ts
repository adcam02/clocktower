import Peer, { type DataConnection } from 'peerjs';
import { create } from 'zustand';
import { st, toPrivate, toPublic, useHost } from '../state/host';
import type { ClientMessage, HostMessage } from '../state/types';
import { joinMesh, type Mesh } from './mesh';
import { useUpdate } from '../lib/version';
import { hostPeerId, peerDisabled, peerOptions, type LinkStatus } from './peer';

interface HostNet {
  status: LinkStatus;
  detail: string;
  online: Record<string, true>;
}

export const useHostNet = create<HostNet>(() => ({ status: 'starting', detail: '', online: {} }));

/** One player's connection, over either route. */
interface Link {
  kind: 'peerjs' | 'mesh';
  send: (msg: HostMessage) => void;
  close: () => void;
  isOpen: () => boolean;
}

interface LinkMeta {
  playerId: string | null;
  lastSeen: number;
  sentPublic?: string;
  sentPrivate?: string;
}

const RETRYABLE = new Set(['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected']);

class HostLink {
  private peer: Peer | null = null;
  private mesh: Mesh | null = null;
  private meshLinks = new Map<string, Link>();
  private room = '';
  private links = new Map<Link, LinkMeta>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  start(room: string) {
    if (this.room === room) return;
    this.stop();
    this.room = room;
    if (peerDisabled()) useHostNet.setState({ status: 'reconnecting', detail: 'Using the backup route only.' });
    else this.openPeer();
    this.openMesh();
    this.sweepTimer = setInterval(() => this.sweep(), 5000);
  }

  stop() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    for (const l of this.links.keys()) l.close();
    this.links.clear();
    this.meshLinks.clear();
    this.peer?.destroy();
    this.peer = null;
    this.mesh?.leave();
    this.mesh = null;
    this.room = '';
  }

  // ---------------------------------------------------------------- PeerJS, the main route

  private openPeer() {
    useHostNet.setState({ status: 'starting', detail: 'Opening the room…' });
    const peer = new Peer(hostPeerId(this.room), peerOptions());
    this.peer = peer;
    peer.on('open', () => useHostNet.setState({ status: 'open', detail: '' }));
    peer.on('connection', (conn) => this.acceptPeer(conn));
    peer.on('disconnected', () => {
      if (peer.destroyed || this.peer !== peer) return;
      useHostNet.setState({ status: 'reconnecting', detail: 'Lost the lobby server. Reconnecting… Players can still join through the backup route.' });
      setTimeout(() => !peer.destroyed && peer.disconnected && peer.reconnect(), 1500);
    });
    peer.on('error', (err) => {
      const type = (err as { type?: string }).type ?? '';
      if (this.peer !== peer) return;
      if (type === 'unavailable-id') {
        // The previous tab still holds the room for a few seconds after a reload.
        useHostNet.setState({ status: 'reconnecting', detail: 'Reclaiming the room from your last visit…' });
        this.reopenPeer(4000);
      } else if (RETRYABLE.has(type)) {
        useHostNet.setState({ status: 'reconnecting', detail: 'Can’t reach the lobby server. Retrying… Players can still join through the backup route.' });
        this.reopenPeer(5000);
      } else if (type !== 'peer-unavailable') {
        console.warn('Peer error', type, err);
      }
    });
  }

  private reopenPeer(delay: number) {
    this.peer?.destroy();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.room && this.openPeer(), delay);
  }

  private acceptPeer(conn: DataConnection) {
    const link: Link = {
      kind: 'peerjs',
      send: (msg) => conn.open && conn.send(msg),
      close: () => conn.close(),
      isOpen: () => conn.open,
    };
    this.links.set(link, { playerId: null, lastSeen: Date.now() });
    conn.on('data', (raw) => this.receive(link, raw as ClientMessage));
    conn.on('close', () => this.drop(link));
    conn.on('error', () => this.drop(link));
  }

  // ---------------------------------------------------------------- Trystero, the backup route

  private openMesh() {
    this.mesh = joinMesh(this.room, {
      onJoin: (peerId) => {
        let open = true;
        const link: Link = {
          kind: 'mesh',
          send: (msg) => open && this.mesh?.send(msg, peerId),
          close: () => void (open = false),
          isOpen: () => open,
        };
        this.meshLinks.set(peerId, link);
        this.links.set(link, { playerId: null, lastSeen: Date.now() });
        // Other players are in this room too; tell this one which browser is the Storyteller.
        link.send({ t: 'host' });
      },
      onLeave: (peerId) => {
        const link = this.meshLinks.get(peerId);
        this.meshLinks.delete(peerId);
        if (link) {
          link.close();
          this.drop(link);
        }
      },
      onMessage: (msg, peerId) => {
        const link = this.meshLinks.get(peerId);
        if (link) this.receive(link, msg as ClientMessage);
      },
    });
  }

  // ---------------------------------------------------------------- shared

  private drop(link: Link) {
    if (!this.links.delete(link)) return;
    this.refreshOnline();
  }

  private sweep() {
    const now = Date.now();
    // The backup route notices departures itself; PeerJS channels can go quiet without closing.
    for (const [link, meta] of this.links) {
      if (link.kind === 'peerjs' && now - meta.lastSeen > 20000) {
        link.close();
        this.drop(link);
      }
    }
  }

  private receive(link: Link, msg: ClientMessage) {
    const meta = this.links.get(link);
    if (!meta || !msg || typeof msg !== 'object') return;
    meta.lastSeen = Date.now();
    if (msg.t === 'ping') {
      link.send({ t: 'pong' });
      return;
    }
    if (msg.t === 'hello') {
      meta.playerId = String(msg.playerId).slice(0, 40);
      // A player on a newer version means this page is out of date.
      if (msg.v && msg.v > __BUILD__) useUpdate.setState({ available: true });
      meta.sentPublic = meta.sentPrivate = undefined;
      // A refreshed tab replaces its old connection on the same route.
      for (const [other, m] of this.links) {
        if (other !== link && other.kind === link.kind && m.playerId === meta.playerId) {
          this.links.delete(other);
          other.close();
        }
      }
      this.refreshOnline();
      this.flushTo(link, meta);
      return;
    }
    const pid = meta.playerId;
    if (!pid) return;
    const p = st.fromPlayer;
    switch (msg.t) {
      case 'claim':
        p.claim(pid, msg.seatId, String(msg.name ?? ''));
        break;
      case 'leave':
        p.leave(pid);
        break;
      case 'rename':
        p.rename(pid, String(msg.name ?? ''));
        break;
      case 'vote':
        p.vote(pid, Boolean(msg.up));
        break;
      case 'ack':
        p.ack(pid, msg.wakeId);
        break;
      case 'back':
        p.back(pid, String(msg.id));
        break;
      case 'video':
        p.video(pid, msg.videoId ? String(msg.videoId) : null, msg.list ? String(msg.list) : undefined);
        break;
      case 'reply':
        p.reply(pid, msg.wakeId, { seatIds: msg.seatIds, roleIds: msg.roleIds, answer: msg.answer });
        break;
    }
  }

  private refreshOnline() {
    const online: Record<string, true> = {};
    for (const m of this.links.values()) if (m.playerId) online[m.playerId] = true;
    useHostNet.setState({ online });
  }

  scheduleBroadcast() {
    if (this.broadcastTimer) return;
    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null;
      for (const [link, meta] of this.links) this.flushTo(link, meta);
    }, 15);
  }

  /** Sends a player the public state and their own private state, if either changed. */
  private flushTo(link: Link, meta: LinkMeta) {
    if (!meta.playerId || !link.isOpen()) return;
    const g = useHost.getState().g;
    const online = new Set(Object.keys(useHostNet.getState().online));
    const pub = toPublic(g, online);
    const pubJson = JSON.stringify(pub);
    try {
      if (pubJson !== meta.sentPublic) {
        meta.sentPublic = pubJson;
        link.send({ t: 'state', s: pub, now: Date.now(), v: __BUILD__ });
      }
      const priv = toPrivate(g, meta.playerId);
      const privJson = JSON.stringify(priv);
      if (privJson !== meta.sentPrivate) {
        meta.sentPrivate = privJson;
        link.send({ t: 'private', p: priv });
      }
    } catch (e) {
      console.warn('Send failed', e);
    }
  }
}

export const hostLink = new HostLink();

useHost.subscribe(() => hostLink.scheduleBroadcast());
useHostNet.subscribe((s, prev) => s.online !== prev.online && hostLink.scheduleBroadcast());

if (import.meta.env.DEV) Object.assign(window, { __host: useHost, __hostNet: useHostNet });
