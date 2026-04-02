import type { Server } from 'socket.io';
import type { WSEvent } from '@gitflow/shared';
import { registerPresenceHandlers } from './presenceService';
import { logger } from './logger';

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket) => {
    logger.info(`[ws] client connected: ${socket.id}`);

    socket.on('subscribe:repo', (repoFullName: string) => {
      socket.join(`repo:${repoFullName}`);
      logger.info(`[ws] ${socket.id} subscribed to repo:${repoFullName}`);
    });

    socket.on('unsubscribe:repo', (repoFullName: string) => {
      socket.leave(`repo:${repoFullName}`);
    });

    // Feature 11: Live cursor presence
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`[ws] client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Broadcast a typed event to all clients watching a given repo.
 */
export function emitRepoEvent<T>(
  io: Server,
  repoFullName: string,
  event: Partial<WSEvent<T>>
): void {
  const wsEvent: WSEvent<T> = {
    type: event.type || 'graph:updated',
    payload: event.payload as T,
    timestamp: event.timestamp || new Date().toISOString(),
    repoId: repoFullName,
  };
  
  io.to(`repo:${repoFullName}`).emit(wsEvent.type, wsEvent);
}
