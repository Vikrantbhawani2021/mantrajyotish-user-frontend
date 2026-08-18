// Centralized backend configuration
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com";

// Helper to build full API URLs. Ensures single place to change base URL.
export const api = (path) => `${BACKEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;
