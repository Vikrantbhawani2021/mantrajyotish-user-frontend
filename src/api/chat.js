import { apiFetch } from "./client";

export async function initiateChat({ userId, astrologerId, name, userName }) {
  return apiFetch("/api/chat/initiate", {
    method: "POST",
    body: { userId, astrologerId, name, userName }
  });
}

// Additional Chat API helpers (placeholders) you can expand as needed
export async function sendMessage(payload) {
  return apiFetch("/api/chat/send", { method: "POST", body: payload });
}

export async function getHistory(sessionId) {
  return apiFetch(`/api/chat/history/${sessionId}`, { method: "GET" });
}

export async function endChat(sessionId) {
  return apiFetch(`/api/chat/end`, { method: "POST", body: { sessionId } });
}

export async function rateChat(payload) {
  return apiFetch(`/api/chat/rate`, { method: "POST", body: payload });
}

export async function getSessionsForUser(userId) {
  const q = userId ? `?userId=${userId}` : "";
  return apiFetch(`/api/chat/sessions${q}`, { method: "GET" });
}

export async function uploadImage(formData) {
  return apiFetch(`/api/upload/image`, { method: "POST", body: formData });
}
