import { create } from 'zustand';
import type { WSEvent, WSEventType } from '@gitflow/shared';

export interface ActivityItem {
  id: string;
  type: WSEventType;
  repoId: string;
  payload: Record<string, string>;
  timestamp: string;
}

interface ActivityState {
  items: ActivityItem[];
  unreadCount: number;
  addEvent: (event: WSEvent) => void;
  markAllRead: () => void;
  clear: () => void;
}

let itemCounter = 0;
const MAX_ITEMS = 200;

export const useActivityStore = create<ActivityState>((set) => ({
  items: [],
  unreadCount: 0,

  addEvent: (event: WSEvent) => {
    const item: ActivityItem = {
      id: `act_${++itemCounter}`,
      type: event.type,
      repoId: event.repoId,
      payload: event.payload as Record<string, string>,
      timestamp: event.timestamp,
    };
    set(state => ({
      items: [item, ...state.items].slice(0, MAX_ITEMS),
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAllRead: () => set({ unreadCount: 0 }),
  clear: () => set({ items: [], unreadCount: 0 }),
}));
