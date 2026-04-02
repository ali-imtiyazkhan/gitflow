'use client';

import { useEffect, useCallback } from 'react';
import { useHistoryStore } from '@/store/historyStore';

export interface Shortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  label: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handler = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    for (const s of shortcuts) {
      const metaMatch  = s.meta  ? (e.metaKey || e.ctrlKey) : true;
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey || s.key === '?';
      const keyMatch   = e.key.toLowerCase() === s.key.toLowerCase();
      
      if (metaMatch && shiftMatch && keyMatch) {
        e.preventDefault();
        s.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}

/** 
 * Default global shortcuts 
 */
export function useGlobalShortcuts(opts: {
  onSearch?: () => void;
  onNewBranch?: () => void;
  onHelp?: () => void;
  onExport?: () => void;
}) {
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  useKeyboardShortcuts([
    { key: 'z', meta: true, label: 'Undo', action: () => canUndo && undo() },
    { key: 'z', meta: true, shift: true, label: 'Redo', action: () => canRedo && redo() },
    { key: 'k', meta: true, label: 'Search', action: opts.onSearch ?? (() => {}) },
    { key: 'b', meta: true, label: 'New branch', action: opts.onNewBranch ?? (() => {}) },
    { key: 'e', meta: true, label: 'Export graph', action: opts.onExport ?? (() => {}) },
    { key: '?', label: 'Keyboard help', action: opts.onHelp ?? (() => {}) },
  ]);
}

export const ALL_SHORTCUTS: Omit<Shortcut, 'action'>[] = [
  { key: 'z',   meta: true,               label: 'Undo last action'  },
  { key: 'z',   meta: true, shift: true,  label: 'Redo'              },
  { key: 'k',   meta: true,               label: 'Search branches'   },
  { key: 'b',   meta: true,               label: 'New branch'        },
  { key: 'e',   meta: true,               label: 'Export graph'      },
  { key: 'm',   meta: true,               label: 'Merge selected'    },
  { key: 'Escape',                         label: 'Close panels'      },
  { key: '?',                              label: 'Show this help'    },
];
