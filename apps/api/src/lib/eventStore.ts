import type { WSEvent } from '@gitflow/shared';

interface StoredEvent {
  id: string;
  repoId: string;
  githubEvent: string;
  payload: unknown;
  receivedAt: number;
}

const MAX_EVENTS = 500;
const store: StoredEvent[] = [];
let counter = 0;

export const eventStore = {
  append(event: Omit<StoredEvent, 'id'>): StoredEvent {
    const entry: StoredEvent = { id: `evt_${++counter}`, ...event };
    store.push(entry);
    if (store.length > MAX_EVENTS) {
      store.splice(0, store.length - MAX_EVENTS);
    }
    return entry;
  },

  forRepo(repoId: string, limit = 100): StoredEvent[] {
    return store
      .filter(e => e.repoId === repoId)
      .slice(-limit)
      .reverse();
  },

  getById(id: string): StoredEvent | undefined {
    return store.find(e => e.id === id);
  },

  clear(repoId: string): void {
    const indices = store.reduce<number[]>((acc, e, i) => {
      if (e.repoId === repoId) acc.push(i);
      return acc;
    }, []);
    for (const i of indices.reverse()) {
      store.splice(i, 1);
    }
  },
};
