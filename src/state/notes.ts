import { create } from 'zustand';
import { loadJSON, saveJSON } from '../lib/util';

/** A player's private guesses about other seats. They never leave this browser. */
interface Notes {
  room: string;
  notes: Record<string, string>;
}

export const useNotes = create<Notes>(() => ({ room: '', notes: {} }));

export const notes = {
  load(room: string) {
    useNotes.setState({ room, notes: loadJSON(`clocktower:notes:${room}`, {}) });
  },
  set(seatId: string, roleId: string | null) {
    const { room, notes: cur } = useNotes.getState();
    const next = { ...cur };
    if (roleId) next[seatId] = roleId;
    else delete next[seatId];
    useNotes.setState({ notes: next });
    saveJSON(`clocktower:notes:${room}`, next);
  },
  clear() {
    const { room } = useNotes.getState();
    useNotes.setState({ notes: {} });
    saveJSON(`clocktower:notes:${room}`, {});
  },
};
