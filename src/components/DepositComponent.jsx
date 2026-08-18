import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../component/Toast";
import { createOrder, verifyPayment, loadRazorpayScript } from "../payments/razorpay";
import { getBalance } from "../api/wallet";

/**
 * Reusable Deposit component
 * Props:
 * - amount (number, rupees) default: required by caller
 * - appointmentId (optional) to link payment to an appointment
 * - onSuccess (optional) callback called with verify data after successful verify
 * - buttonLabel (optional) text for the action button
 */
export default function DepositComponent({ amount, appointmentId = null, onSuccess, buttonLabel }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const readProcessed = () => {
    try {
      const v = localStorage.getItem("processed_payments");
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  };

  const saveProcessed = (arr) => {
    try { localStorage.setItem("processed_payments", JSON.stringify(arr)); } catch {}
  };

  const handlePay = async () => {
    if (!amount || Number(amount) <= 0) {
      setToast({ show: true, message: "Enter a valid amount.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      // 1) create order on server (amount in rupees)
      const extras = {};
      if (appointmentId) extras.appointmentId = appointmentId;
      const orderRes = await createOrder(Number(amount), extras);
      if (!orderRes || !orderRes.success || !orderRes.data?.order) {
        setToast({ show: true, message: (orderRes?.message || "Order creation failed"), type: "error" });
        setLoading(false);
        return;
      }

      const { order, keyId } = orderRes.data;
      // 2) load checkout script
      const ok = await loadRazorpayScript();
      if (!ok) {
        setToast({ show: true, message: "Razorpay SDK failed to load.", type: "error" });
        setLoading(false);
        return;
      }

      // prepare prefill
      let prefill = {};
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        if (u) {
          if (u.name) prefill.name = u.name;
          if (u.email) prefill.email = u.email;
          if (u.phone) prefill.contact = (u.phone || "").replace(/^\+/, "");
        }
      } catch {}

      const options = {
        key: keyId,
        order_id: order.id,
        amount: order.amount, // pass the server order amount (paise)
        currency: order.currency || "INR",
        name: "Astro Wallet",
        description: `Add ₹${amount} to wallet`,
        prefill,
        theme: { color: "#FF6F3D" },
        handler: async function (resp) {
          // idempotency check
          const paymentId = resp.razorpay_payment_id;
          const processed = readProcessed();
          if (processed.includes(paymentId)) {
            setToast({ show: true, message: "Payment already processed.", type: "info" });
            if (onSuccess) onSuccess({ paymentId, orderId: resp.razorpay_order_id });
            return;
          }

          // verify on server
          setVerifying(true);
          try {
            const verifyRes = await verifyPayment({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature
            });

            if (verifyRes && verifyRes.success) {
              // mark payment as processed locally
              const pid = resp.razorpay_payment_id;
              const next = Array.from(new Set([...processed, pid]));
              saveProcessed(next);

              // show server-provided addedAmount if present
              const added = verifyRes?.data?.addedAmount;
              if (typeof added === "number") {
                setToast({ show: true, message: `₹${added.toLocaleString("en-IN")} added to wallet`, type: "success" });
              } else {
                setToast({ show: true, message: "Top-up successful.", type: "success" });
              }

              // refresh wallet balance from server
              try {
                await getBalance();
              } catch (e) { /* ignore */ }

              if (onSuccess) onSuccess(verifyRes.data);

              // redirect to wallet after short delay
              setTimeout(() => navigate("/wallet"), 1500);
            } else {
              setToast({ show: true, message: (verifyRes?.message || "Verification failed"), type: "error" });
            }
          } catch (e) {
            console.error("verify error", e);
            setToast({ show: true, message: (e?.message || "Verify failed"), type: "error" });
          } finally {
            setVerifying(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on && rzp.on("payment.failed", function (resp) {
        const err = resp?.error || {};
        const msg = err.description || err.reason || err.code || "Payment failed";
        setToast({ show: true, message: msg, type: "error" });
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: (err?.message || "Payment failed"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handlePay}
        disabled={loading || verifying}
        className="w-full bg-[#FF6F3D] text-white py-3 rounded-xl font-bold disabled:opacity-60"
      >
        {loading ? "Processing…" : (buttonLabel || `Add ₹${amount}`)}
      </button>

      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
    </div>
  );
}
