import { apiFetch } from "./client";

export async function fetchAllAstrologers() {
  return apiFetch("/api/astro/all", { method: "GET" });
}

export async function requestVideoSession(payload) {
  return apiFetch("/api/video-session/request", { method: "POST", body: payload });
}

export default { fetchAllAstrologers, requestVideoSession };
