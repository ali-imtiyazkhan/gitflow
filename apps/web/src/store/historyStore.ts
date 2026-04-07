import { create } from 'zustand';

export interface Command {
  label: string;
  execute: () => Promise<void> | void;
  undo: () => Promise<void> | void;
}

interface HistoryState {
  past: Command[];
  future: Command[];
  canUndo: boolean;
  canRedo: boolean;
  isExecuting: boolean;
  execute: (cmd: Command) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;
}

const MAX_HISTORY = 50;

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  isExecuting: false,

  execute: async (cmd: Command) => {
    if (get().isExecuting) return;
    set({ isExecuting: true });

    try {
      await cmd.execute();
      set(state => {
        const past = [...state.past, cmd].slice(-MAX_HISTORY);
        return { past, future: [], canUndo: true, canRedo: false, isExecuting: false };
      });
    } catch (error) {
      console.error(`[HistoryStore] Command "${cmd.label}" failed:`, error);
      set({ isExecuting: false });
      throw error; // Re-throw so callers can handle it
    }
  },

  undo: async () => {
    const { past, isExecuting } = get();
    if (past.length === 0 || isExecuting) return;

    const cmd = past[past.length - 1];
    set({ isExecuting: true });

    try {
      await cmd.undo();
      set(state => ({
        past: state.past.slice(0, -1),
        future: [cmd, ...state.future],
        canUndo: state.past.length > 1,
        canRedo: true,
        isExecuting: false,
      }));
    } catch (error) {
      console.error(`[HistoryStore] Undo "${cmd.label}" failed:`, error);
      set({ isExecuting: false });
      throw error;
    }
  },

  redo: async () => {
    const { future, isExecuting } = get();
    if (future.length === 0 || isExecuting) return;

    const cmd = future[0];
    set({ isExecuting: true });

    try {
      await cmd.execute();
      set(state => ({
        past: [...state.past, cmd],
        future: state.future.slice(1),
        canUndo: true,
        canRedo: state.future.length > 1,
        isExecuting: false,
      }));
    } catch (error) {
      console.error(`[HistoryStore] Redo "${cmd.label}" failed:`, error);
      set({ isExecuting: false });
      throw error;
    }
  },

  clear: () => set({ past: [], future: [], canUndo: false, canRedo: false }),
}));

// Helpers to create typed commands
export const NodeMoveCommand = (
  branchId: string,
  from: { x: number; y: number },
  to: { x: number; y: number },
  updateFn: (id: string, x: number, y: number) => void
): Command => ({
  label: `Move ${branchId}`,
  execute: () => updateFn(branchId, to.x, to.y),
  undo: () => updateFn(branchId, from.x, from.y),
});
