import { Server } from 'socket.io';

let io;

const DEFAULT_SOCKET_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5172',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178', // employee-portal
];

function getSocketCorsOrigins() {
  const extra = process.env.SOCKET_CORS_ORIGINS;
  if (!extra || !String(extra).trim()) return DEFAULT_SOCKET_ORIGINS;
  const parsed = String(extra)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_SOCKET_ORIGINS, ...parsed])];
}

/**
 * Tell the employee portal (joined room user-{id}) to refetch a tab’s data.
 * @param {number|string} userId
 * @param {'leave'|'qualification'|'dependent'|'salary_advance'|'overtime'|'business_trip'} domain
 */
export function emitEmployeePortalRefresh(userId, domain) {
  if (userId == null || userId === '') return;
  const id = Number(userId);
  if (Number.isNaN(id)) return;
  emitToRoom(`user-${id}`, 'portal-refresh', { domain: String(domain) });
}

/**
 * Initialize Socket.io server
 * @param {import('http').Server} httpServer
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: getSocketCorsOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    // Client joins a room based on role/userId
    socket.on('join-room', ({ room }) => {
      socket.join(room);
      console.log(`[Socket.io] ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get the Socket.io instance
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket() first.');
  }
  return io;
}

/**
 * Emit an event to a specific room
 * @param {string} room
 * @param {string} event
 * @param {any} data
 */
export function emitToRoom(room, event, data) {
  if (!io) return;
  io.to(room).emit(event, data);
}

/**
 * Broadcast an event to all connected clients
 * @param {string} event
 * @param {any} data
 */
export function broadcast(event, data) {
  if (!io) return;
  io.emit(event, data);
}
