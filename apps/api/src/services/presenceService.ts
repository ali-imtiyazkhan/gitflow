import type { Server, Socket } from 'socket.io';
import type { CursorPosition } from '@gitflow/shared';

const CURSOR_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444',
  '#06b6d4','#ec4899','#84cc16','#f97316','#6366f1',
];

// repoId → Map<socketId, CursorPosition>
const presenceRooms = new Map<string, Map<string, CursorPosition>>();

let colorIndex = 0;
function nextColor() { 
  return CURSOR_COLORS[colorIndex++ % CURSOR_COLORS.length]; 
}

export function registerPresenceHandlers(io: Server, socket: Socket): void {
  let currentRoom: string | null = null;
  const userColor = nextColor();

  socket.on('presence:join', ({ repoId, userId, username }: { repoId: string; userId: string; username: string }) => {
    if (currentRoom) {
      presenceRooms.get(currentRoom)?.delete(socket.id);
      io.to(currentRoom).emit('presence:update', getRoomCursors(currentRoom));
      socket.leave(currentRoom);
    }

    currentRoom = `presence:${repoId}`;
    socket.join(currentRoom);

    if (!presenceRooms.has(repoId)) {
      presenceRooms.set(repoId, new Map());
    }
    
    presenceRooms.get(repoId)!.set(socket.id, {
      x: 0, y: 0, userId, username, color: userColor, updatedAt: Date.now(),
    });

    io.to(currentRoom).emit('presence:update', getRoomCursors(repoId));
  });

  socket.on('presence:cursor', ({ x, y }: { x: number; y: number }) => {
    if (!currentRoom) return;
    const repoId = currentRoom.replace('presence:', '');
    const cursor = presenceRooms.get(repoId)?.get(socket.id);
    if (cursor) {
      cursor.x = x; 
      cursor.y = y; 
      cursor.updatedAt = Date.now();
      // Broadcast to others only (not self)
      socket.to(currentRoom).emit('presence:cursor', { 
        socketId: socket.id, 
        x, y, 
        color: cursor.color, 
        username: cursor.username 
      });
    }
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const repoId = currentRoom.replace('presence:', '');
    presenceRooms.get(repoId)?.delete(socket.id);
    io.to(currentRoom).emit('presence:update', getRoomCursors(repoId));
    io.to(currentRoom).emit('presence:leave', { socketId: socket.id });
  });
}

function getRoomCursors(repoId: string): CursorPosition[] {
  const cleanId = repoId.replace('presence:', '');
  return Array.from(presenceRooms.get(cleanId)?.values() ?? []);
}
