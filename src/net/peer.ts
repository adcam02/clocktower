import type { PeerOptions } from 'peerjs';

declare global {
  interface Window {
    CLOCKTOWER_CONFIG?: { peer?: Partial<PeerOptions> | null };
  }
}

/** Every room shares the public PeerJS server, so room ids carry a prefix of their own. */
export function hostPeerId(room: string): string {
  return `ravenswood-bluff-grimoire-${room.toLowerCase()}`;
}

export function peerOptions(): PeerOptions {
  // ?peer=localhost:9000 points at a local PeerServer, for testing.
  const local = new URLSearchParams(location.search).get('peer');
  if (local) {
    const [host, port] = local.split(':');
    return { host, port: Number(port) || 9000, path: '/', secure: false, debug: 1 };
  }
  return { ...(window.CLOCKTOWER_CONFIG?.peer ?? {}), debug: 1 };
}

/** ?nopeer skips the PeerJS route, to test the backup route. */
export function peerDisabled(): boolean {
  return new URLSearchParams(location.search).has('nopeer');
}

export type LinkStatus = 'starting' | 'open' | 'reconnecting' | 'waiting' | 'error';
