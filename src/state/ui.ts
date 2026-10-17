import { create } from 'zustand';
import { loadJSON, saveJSON } from '../lib/util';
import type { Ask, WakePanel } from './types';

export type Modal =
  | { kind: 'script' }
  | { kind: 'bag' }
  | { kind: 'wake' }
  | { kind: 'character'; seatId: string; purpose: 'role' | 'shown' | 'note' }
  | { kind: 'reminder'; seatId: string }
  | { kind: 'bluff'; index: number }
  | { kind: 'fabled' }
  | { kind: 'rename'; seatId: string }
  | { kind: 'share' }
  | { kind: 'settings' }
  | { kind: 'claim'; seatId: string }
  | { kind: 'role'; roleId: string }
  | { kind: 'dawnCheck' }
  | null;

export type Pick =
  | { kind: 'nominee'; nominatorId: string | null }
  | { kind: 'swap'; seatId: string }
  | { kind: 'move'; seatId: string }
  | { kind: 'swapRole'; seatId: string }
  | null;

export type Panel = 'night' | 'reference' | 'history' | 'notes' | 'journal' | null;

export interface WakeDraft {
  to: string[];
  panels: WakePanel[];
  active: number;
  ask: Ask;
  /** Cards only some of the people woken will see, by seat. */
  extra: Record<string, WakePanel[]>;
  sentId: string | null;
}

export const emptyPanel = (): WakePanel => ({ card: null, signs: [], roleIds: [], seatIds: [], text: '' });

interface UI {
  modal: Modal;
  panel: Panel;
  menuSeat: string | null;
  pick: Pick;
  hideGrimoire: boolean;
  muted: boolean;
  draft: WakeDraft;
  toasts: { id: number; text: string; tone?: 'good' | 'evil' | 'info' }[];
  banner: { text: string; sub: string; key: number } | null;
}

const prefs = loadJSON<{ muted?: boolean; panel?: Panel }>('clocktower:prefs', {});

export const useUI = create<UI>(() => ({
  modal: null,
  panel: prefs.panel ?? null,
  menuSeat: null,
  pick: null,
  hideGrimoire: false,
  muted: prefs.muted ?? false,
  draft: { to: [], panels: [emptyPanel()], active: 0, ask: null, extra: {}, sentId: null },
  toasts: [],
  banner: null,
}));

useUI.subscribe((s, p) => {
  if (s.muted !== p.muted || s.panel !== p.panel) saveJSON('clocktower:prefs', { muted: s.muted, panel: s.panel });
});

export const ui = {
  open: (modal: Modal) => useUI.setState({ modal, menuSeat: null }),
  close: () => useUI.setState({ modal: null }),
  togglePanel: (panel: Exclude<Panel, null>) => useUI.setState((s) => ({ panel: s.panel === panel ? null : panel })),
  menu: (seatId: string | null) => useUI.setState({ menuSeat: seatId }),
  pick: (pick: Pick) => useUI.setState({ pick, menuSeat: null }),
  setDraft: (fn: (d: WakeDraft) => WakeDraft) => useUI.setState((s) => ({ draft: fn(s.draft) })),
  /** Opens the wake screen for these seats, optionally with cards already laid out. */
  wake: (to: string[], panels?: WakePanel[], ask: Ask = null, extra: Record<string, WakePanel[]> = {}) =>
    useUI.setState((s) => ({
      modal: { kind: 'wake' },
      menuSeat: null,
      draft: panels
        ? { to, panels, active: panels.length - 1, ask, extra, sentId: null }
        : { ...s.draft, to, sentId: s.draft.to.join() === to.join() ? s.draft.sentId : null },
    })),
  banner: (text: string, sub = '') => {
    const key = Date.now();
    useUI.setState({ banner: { text, sub, key } });
    setTimeout(() => useUI.setState((s) => (s.banner?.key === key ? { banner: null } : {})), 3200);
  },
  toast: (text: string, tone?: 'good' | 'evil' | 'info') => {
    const id = Date.now() + Math.random();
    useUI.setState((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
    setTimeout(() => useUI.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
  },
};
