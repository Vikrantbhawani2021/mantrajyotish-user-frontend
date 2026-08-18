import { apiFetch } from "./client";

export async function endVideoSession(sessionId) {
  return apiFetch(`/api/video-session/end/${sessionId}`, { method: "POST" });
}

export async function rateVideoSession(payload) {
  return apiFetch(`/api/video-session/rate`, { method: "POST", body: payload });
}

export async function callRate(payload) {
  return apiFetch(`/api/call/rate`, { method: "POST", body: payload });
}

export async function getVideoHistory(userId, role = "user") {
  const q = userId ? `?userId=${userId}&role=${encodeURIComponent(role)}` : `?role=${encodeURIComponent(role)}`;
  return apiFetch(`/api/video-session/history${q}`, { method: "GET" });
}

export default { endVideoSession, rateVideoSession, callRate };
