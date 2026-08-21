import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/backend";
import { usePresenceStore } from "../store/presenceStore";

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem("authToken") || localStorage.getItem("token");

  // Single Socket.IO Connection for the entire application session
  socket = io(BACKEND_URL, {
    transports: ["polling", "websocket"],
    auth: {
      token: token
    },
    query: {
      token: token
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
  });

  socket.on("connect", () => {
    if (import.meta.env.DEV) {
      console.log("🔌 Connected to real-time presence/messaging gateway:", socket.id);
    }
  });

  // Global handler for presence changes (keeps Zustand store up to date)
  socket.on("presence:status_changed", (data) => {
    if (import.meta.env.DEV) {
      console.log("⚡ Presence status update:", data);
    }
    usePresenceStore.getState().setPresence(data.astrologerId, data.status, data.version);
  });

  // Initial state received on subscriptions
  socket.on("presence:initial_state", (data) => {
    if (import.meta.env.DEV) {
      console.log("⚡ Received initial presence states:", data.presences);
    }
    usePresenceStore.getState().setInitialState(data.presences);
  });

  socket.on("connect_error", (err) => {
    if (import.meta.env.DEV) {
      console.error("⚠️ Socket connection error:", err.message);
    }
  });

  socket.on("disconnect", (reason) => {
    if (import.meta.env.DEV) {
      console.log("🔌 Socket disconnected from gateway:", reason);
    }
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
