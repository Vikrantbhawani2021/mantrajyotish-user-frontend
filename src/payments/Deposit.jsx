import React, { useState, useEffect } from "react";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function Deposit({ amount = 500, authToken = null, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const createOrder = async (amount) => {
    const resp = await fetch("/api/razorpay/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    return resp.json();
  };

  const verifyPayment = async (payload) => {
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const resp = await fetch("/api/razorpay/verify", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return resp.json();
  };

  const handlePay = async () => {
    setLoading(true);
    const ok = await loadRazorpayScript();
    if (!ok) {
      alert("Razorpay SDK failed to load. Check network.");
      setLoading(false);
      return;
    }

    // 1) Create order on server
    const orderResp = await createOrder(amount);
    if (!orderResp || !orderResp.success || !orderResp.data?.order) {
      alert(orderResp?.message || "Order creation failed");
      setLoading(false);
      return;
    }

    const { order, keyId } = orderResp.data;

    // 2) Open Razorpay Checkout
    const options = {
      key: keyId, // server returns keyId
      amount: order.amount, // in paise (server created it)
      currency: order.currency || "INR",
      name: "Your App Name",
      description: "Add money to wallet",
      order_id: order.id,
      handler: async function (response) {
        // 3) Verify payment on server
        const payload = {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          amount, // amount in rupees (optional, server-side will resolve amount too)
        };

        const verify = await verifyPayment(payload);
        if (verify && verify.success) {
          if (onSuccess) onSuccess(verify.data);
          alert("Payment verified successfully");
        } else {
          alert("Payment verification failed: " + (verify?.message || ""));
        }
      },
      modal: {
        ondismiss: function () {
          // user closed the checkout
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handlePay} disabled={loading}>
        {loading ? "Processing..." : `Add ₹${amount}`}
      </button>
    </div>
  );
}
