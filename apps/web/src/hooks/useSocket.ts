import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const useSocket = (repoId?: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket]: Connected to server');
      if (repoId) {
        socket.emit('join-repo', repoId);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket]: Disconnected from server');
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket]: Connection error:', err);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [repoId]);

  return socketRef.current;
};
