'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { useGraphStore } from '@/store/graphStore';
import { useActivityStore } from '@/store/activityStore';
import type { WSEvent } from '@gitflow/shared';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

interface UseWebSocketOptions {
  owner: string;
  repo: string;
}

// inslizing a websocket connection
export function useWebSocket({ owner, repo }: UseWebSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const { data: session } = useSession();
  const { setActiveConflict, completeMerge } = useGraphStore();
  const { addEvent } = useActivityStore();

  const repoId = `${owner}/${repo}`;

  const handleEvent = useCallback((event: WSEvent) => {
    addEvent(event);
    switch (event.type) {
      case 'merge:completed': {
        const p = event.payload as { sourceBranch?: string };
        if (p.sourceBranch) {
          completeMerge(p.sourceBranch);
        }
        break;
      }
      case 'merge:conflict': {
        break;
      }
      default:
        break;
    }
  }, [addEvent, completeMerge]);

  useEffect(() => {
    if (!session?.accessToken) return;

    const socket = io(WS_URL, {
      auth: { token: session.accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Standard repo subscription
      socket.emit('subscribe:repo', repoId);
      
      // Multiplayer presence
      socket.emit('presence:join', {
        repoId,
        userId: session.user?.email || 'anonymous',
        username: session.user?.name || 'Anonymous',
      });
    });

    // Listen for all event types defined in shared types
    const wsEvents: WSEvent['type'][] = [
      'branch:created',
      'branch:deleted',
      'branch:updated',
      'merge:started',
      'merge:completed',
      'merge:conflict',
      'conflict:resolved',
      'graph:updated',
      'approval:requested',
      'approval:status_changed',
      'deployment:ready'
    ];
    
    wsEvents.forEach(type => {
      socket.on(type, (event: WSEvent) => handleEvent(event));
    });

    return () => {
      socket.emit('unsubscribe:repo', repoId);
      wsEvents.forEach(type => socket.off(type));
      socket.disconnect();
      socketRef.current = null;
    };
  }, [repoId, session, handleEvent]);

  const emitCursorMove = useCallback((x: number, y: number) => {
    socketRef.current?.emit('presence:cursor', { x, y });
  }, []);

  return { socket: socketRef.current, emitCursorMove };
}
