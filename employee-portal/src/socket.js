import { io } from "socket.io-client";

const raw = (import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/$/, "");
const origin = raw.replace(/\/api$/i, "");

const socket = io(origin, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});

export default socket;
