import { io } from 'socket.io-client';

const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const socket = io(apiBase, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export default socket;