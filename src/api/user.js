import { apiFetch } from "./client";

export async function getProfile() {
  return apiFetch("/api/user/profile", { method: "GET" });
}

export async function updateProfile(payload) {
  return apiFetch("/api/user/profile", { method: "POST", body: payload });
}

export default { getProfile, updateProfile };
