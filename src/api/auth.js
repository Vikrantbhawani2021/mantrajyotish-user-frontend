import { apiFetch } from "./client";

export async function sendOtp(phone) {
  return apiFetch("/api/auth/send-otp", { method: "POST", body: { phone } });
}

export async function verifyOtp(phone, otp) {
  return apiFetch("/api/auth/verify-otp", { method: "POST", body: { phone, otp } });
}

export async function login(payload) {
  return apiFetch("/api/auth/login", { method: "POST", body: payload });
}

export default { sendOtp, verifyOtp, login };
