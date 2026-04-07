import { io } from "socket.io-client";

const url = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const socket = io(url, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export default socket;