import { apiFetch } from "../api/client";

export async function createOrder(amount, extras = {}) {
  // amount in rupees; extras can include { userId, appointmentId }
  const body = { amount, ...extras };
  return apiFetch(`/api/razorpay/order`, { method: "POST", body });
}

export async function verifyPayment(payload) {
  return apiFetch(`/api/razorpay/verify`, { method: "POST", body: payload });
}

export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
    document.body.appendChild(script);
  });
}

export default { createOrder, verifyPayment, loadRazorpayScript };
