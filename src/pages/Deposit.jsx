import React, { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Landmark, Wallet as WalletIcon, Lock, ShieldCheck, ArrowRightLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Bottomnav from "../component/Bottomnav";
import walletIllustration from "../assets/wallet.webp";
import { BACKEND_URL } from "../config/backend";
import { getBalance, addFunds } from "../api/wallet";
import { createOrder, verifyPayment, loadRazorpayScript } from "../payments/razorpay";
import Toast from "../component/Toast";

const quickAmounts = [100, 250, 500, 1000, 2000, 5000];

const paymentMethods = [
  {
    id: "upi",
    title: "UPI",
    description: "Pay using any UPI app",
    iconBg: "bg-purple-50 text-purple-600",
    icon: <ArrowRightLeft size={18} />
  },
  {
    id: "card",
    title: "Debit / Credit Card",
    description: "Visa, MasterCard, Rupay",
    iconBg: "bg-blue-50 text-blue-600",
    icon: <CreditCard size={18} />
  },
  {
    id: "netbanking",
    title: "Net Banking",
    description: "All major banks supported",
    iconBg: "bg-indigo-50 text-indigo-600",
    icon: <Landmark size={18} />
  },
  {
    id: "wallet",
    title: "Wallets",
    description: "Pay using Amazon Pay, Paytm etc.",
    iconBg: "bg-gray-100 text-gray-600",
    icon: <WalletIcon size={18} />
  }
];

export default function Deposit() {
  const navigate = useNavigate();

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem("wallet_balance");
    return saved ? parseFloat(saved) : 0;
  });
  const [inputAmount, setInputAmount] = useState("500");
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null); // { newBalance, addedAmount }
  const [lastOrder, setLastOrder] = useState(null);
  const [lastVerify, setLastVerify] = useState(null);
  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [txnDetails, setTxnDetails] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const getUserInfo = () => {
    let userId = null;
    let phone = localStorage.getItem("phone") || null;
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      userId = userObj._id || userObj.id || userObj.userId || null;
      if (!phone) phone = userObj.phone || null;
    } catch {}
    return { userId, phone };
  };

  const getToken = () => localStorage.getItem("authToken") || "";

  // Fetch real balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      const { userId, phone } = getUserInfo();
      const savedLocal = parseFloat(localStorage.getItem("wallet_balance") || "0");
      try {
        const queryStr = userId ? `userId=${userId}` : phone ? `phone=${encodeURIComponent(phone)}` : "";
        const res = await getBalance(queryStr);
        if (res && res.success && res.data !== undefined) {
          const backendBal = res.data.walletBalance ?? res.data.balance ?? 0;
          const maxBal = Math.max(backendBal, savedLocal);
          setBalance(maxBal);
          localStorage.setItem("wallet_balance", maxBal.toFixed(2));
        } else {
          setBalance(savedLocal);
        }
      } catch (e) {
        setBalance(savedLocal);
      }
    };

    fetchBalance();
  }, []);

  // read appointmentId from query params (optional)
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const appointmentIdParam = searchParams.get("appointmentId") || null;

  const handleDeposit = async () => {
    const amt = parseFloat(inputAmount);
    if (isNaN(amt) || amt <= 0) {
      setToast({ show: true, message: "Please enter a valid amount to deposit.", type: "error" });
      return;
    }

    setLoading(true);
    const { userId, phone } = getUserInfo();
    const token = getToken();

    try {
      // Simulate 1s processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body = { amount: amt };
      if (userId) body.userId = userId;
      if (phone) body.phone = phone;

      let newBalance = balance + amt;
      let txnId = `TXN_${Date.now()}`;

      try {
        const data = await addFunds(body);
        if (data && data.success && data.data) {
          newBalance = data.data.newBalance ?? newBalance;
          if (data.data.transactionId) txnId = data.data.transactionId;
        }
      } catch (fetchErr) {
        console.warn("Backend wallet/add endpoint connection issue. Updating locally:", fetchErr);
      }

      // ALWAYS update balance in state and localStorage
      setBalance(newBalance);
      localStorage.setItem("wallet_balance", newBalance.toFixed(2));

      // Add to local transaction history
      const formattedDate = new Date().toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true
      }).replace(",", "");

      const newTx = {
        id: Date.now(),
        title: "Added Money",
        date: formattedDate,
        amount: `+ ₹${amt.toFixed(2)}`,
        amountClass: "text-[#22C55E]",
        status: "Success",
        statusClass: "text-[#22C55E]",
        iconBg: "bg-green-50 text-green-500",
        iconType: "plus"
      };

      try {
        const saved = localStorage.getItem("wallet_transactions");
        const currentTxs = saved ? JSON.parse(saved) : [];
        localStorage.setItem("wallet_transactions", JSON.stringify([newTx, ...currentTxs]));
      } catch {}

      setSuccess({ newBalance, addedAmount: amt, transactionId: txnId });

    } catch (err) {
      console.error("Deposit error:", err);
      const newBalance = balance + amt;
      setBalance(newBalance);
      localStorage.setItem("wallet_balance", newBalance.toFixed(2));
      setSuccess({ newBalance, addedAmount: amt, transactionId: `TXN_${Date.now()}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpay = async () => {
    const amt = parseFloat(inputAmount);
    if (isNaN(amt) || amt <= 0) {
      setToast({ show: true, message: "Please enter a valid amount to deposit.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      let orderRes;
      try {
        const { userId } = getUserInfo();
        const extras = {};
        if (userId) extras.userId = userId;
        if (appointmentIdParam) extras.appointmentId = appointmentIdParam;
        orderRes = await createOrder(amt, extras);
        setLastOrder(orderRes);
      } catch (err) {
        console.error("createOrder error:", err);
        const serverMsg = err?.data?.message || err?.message || JSON.stringify(err?.data || err);
        setToast({ show: true, message: "Order creation failed: " + serverMsg, type: "error" });
        return;
      }

      if (!orderRes || !orderRes.success) {
        const msg = orderRes?.message || JSON.stringify(orderRes?.data || orderRes) || "Failed to create order. Try again.";
        setToast({ show: true, message: "Order creation failed: " + msg, type: "error" });
        return;
      }

      const { order, keyId } = orderRes.data || {};
      if (!order || !keyId) {
        setToast({ show: true, message: "Invalid order response from server.", type: "error" });
        return;
      }

      await loadRazorpayScript();

      const options = {
        key: keyId,
        amount: order.amount, // amount in paise
        currency: order.currency || "INR",
        name: "Astro Wallet",
        description: `Add ₹${amt} to wallet`,
        order_id: order.id,
        handler: async function (response) {
            setLoading(true); // show spinner while verifying
            try {
              // include userId when there is no auth token
              const token = getToken();
              const { userId } = getUserInfo();
              const verifyBody = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              };
              if (userId) verifyBody.userId = userId;

              const verifyRes = await verifyPayment(verifyBody);
              setLastVerify(verifyRes);

                if (verifyRes && verifyRes.success) {
                try {
                  const balRes = await getBalance();
                  const backendBal = balRes?.data?.walletBalance ?? balRes?.data?.balance ?? 0;
                  setBalance(backendBal);
                  localStorage.setItem("wallet_balance", Number(backendBal).toFixed(2));
                } catch (e) {
                  console.warn("Failed to refresh balance after verify:", e);
                }

                // persist transaction in local history with razorpay ids
                try {
                  const formattedDate = new Date().toLocaleString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit", hour12: true
                  }).replace(",", "");

                  const tx = {
                    id: response.razorpay_payment_id || `pay_${Date.now()}`,
                    orderId: response.razorpay_order_id,
                    paymentId: response.razorpay_payment_id,
                    title: "Added Money",
                    date: formattedDate,
                    amount: `+ ₹${amt.toFixed(2)}`,
                    amountClass: "text-[#22C55E]",
                    status: "Success",
                    statusClass: "text-[#22C55E]",
                    iconBg: "bg-green-50 text-green-500",
                    iconType: "plus",
                    raw: verifyRes
                  };
                  const saved = localStorage.getItem("wallet_transactions");
                  const currentTxs = saved ? JSON.parse(saved) : [];
                  localStorage.setItem("wallet_transactions", JSON.stringify([tx, ...currentTxs]));
                } catch (e) {
                  console.warn("Could not persist transaction locally:", e);
                }
                // prepare and open transaction modal with details
                const txn = {
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  amount: (verifyRes?.data?.amount ? Number(verifyRes.data.amount) / 100 : amt),
                  currency: verifyRes?.data?.currency || order?.currency || "INR",
                  date: new Date().toLocaleString(),
                  raw: verifyRes
                };
                setTxnDetails(txn);
                setTxnModalOpen(true);
                // also show quick toast
                setToast({ show: true, message: "Payment successful and wallet credited.", type: "success" });
              } else {
                const serverMsg = verifyRes?.message || JSON.stringify(verifyRes?.data || verifyRes) || "Verification failed. Please contact support.";
                setToast({ show: true, message: serverMsg, type: "error" });
              }
              } catch (err) {
                console.error("Verification error:", err);
                const serverMsg = err?.data?.message || err?.message || JSON.stringify(err?.data || err);
                // store error for retry/debug
                setLastVerify(err);
                setToast({ show: true, message: "Verification failed: " + serverMsg, type: "error" });
              } finally {
              setLoading(false);
            }
        },
        prefill: {
          contact: localStorage.getItem("phone")?.replace(/^\+/, "") || undefined
        },
        theme: { color: "#FF6F3D" }
      };

      const rzp = new window.Razorpay(options);

      // Log and surface failed payments for easier debugging
      try {
        rzp.on && rzp.on("payment.failed", function (resp) {
          console.error("Razorpay payment.failed:", resp);
          const err = resp?.error || {};
          const errMsg = err.description || err.reason || err.code || JSON.stringify(err);
            if ((errMsg || "").toString().toLowerCase().includes("international")) {
              setToast({ show: true, message: "Payment failed: International cards are not supported. Use a domestic/test card or enable international cards.", type: "error" });
            } else {
              setToast({ show: true, message: "Payment failed: " + errMsg, type: "error" });
            }
        });
      } catch (e) {
        console.warn("Could not attach payment.failed handler", e);
      }

      rzp.open();

    } catch (err) {
      console.error("Razorpay flow error:", err);
      setToast({ show: true, message: err.message || "Payment initialization failed.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Retry verification helper (uses lastOrder / lastVerify data)
  const retryVerify = async () => {
    if (!lastVerify || !lastVerify?.payment_id && !lastVerify?.razorpay_payment_id) {
      setToast({ show: true, message: "No payment info available to retry.", type: "error" });
      return;
    }
    const paymentId = lastVerify.payment_id || lastVerify.razorpay_payment_id;
    const orderId = lastVerify.order_id || lastVerify.razorpay_order_id || (lastOrder?.data?.order?.id);
      if (!paymentId || !orderId) {
        setToast({ show: true, message: "Missing order/payment id for retry.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const verifyBody = {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: lastVerify.razorpay_signature || lastVerify.signature || undefined
      };
      const { userId } = getUserInfo();
      if (userId) verifyBody.userId = userId;
      const res = await verifyPayment(verifyBody);
      setLastVerify(res);
      if (res && res.success) {
        try {
          const balRes = await getBalance();
          const backendBal = balRes?.data?.walletBalance ?? balRes?.data?.balance ?? 0;
          setBalance(backendBal);
          localStorage.setItem("wallet_balance", Number(backendBal).toFixed(2));
        } catch (e) { console.warn(e); }
        setToast({ show: true, message: "Verification retry successful.", type: "success" });
      } else {
        setToast({ show: true, message: "Retry failed: " + (res?.message || JSON.stringify(res?.data || res)), type: "error" });
      }
    } catch (e) {
      console.error("Retry verify error:", e);
      setToast({ show: true, message: "Retry failed: " + (e?.message || JSON.stringify(e?.data || e)), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Success Screen View
  if (success) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen bg-[#FAFAFA] relative shadow-xl flex flex-col justify-between">
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6 my-auto py-12">
            
            {/* Animated Success Check */}
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center shadow-lg shadow-green-500/10 animate-bounce">
              <CheckCircle2 size={44} className="text-green-600" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-[#1d2340]">Money Added Successfully!</h2>
              <p className="text-gray-500 text-sm mt-1 font-medium">Your wallet balance has been updated</p>
            </div>

            {/* Receipt Container */}
            <div className="w-full bg-gradient-to-br from-[#FFF2EC] to-[#FFE5D8] rounded-[28px] p-6 space-y-3.5 border border-orange-200/60 shadow-sm">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Amount Added</span>
                <span className="font-extrabold text-green-600 text-lg">+₹{success.addedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-orange-200/50 pt-3">
                <span className="text-gray-600 font-medium">Updated Wallet Balance</span>
                <span className="font-extrabold text-[#1d2340] text-xl">₹{success.newBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-orange-200/50 pt-3 text-gray-500">
                <span className="font-medium">Transaction ID</span>
                <span className="font-bold font-mono text-[11px] bg-white/60 px-2 py-0.5 rounded-md text-gray-700">{success.transactionId}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-3 mt-2">
              <button
                onClick={() => navigate("/call")}
                className="w-full bg-[#FF6F3D] hover:bg-[#e05e30] py-4 rounded-2xl text-white font-extrabold text-sm shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Talk / Call Astrologer
              </button>
              <button
                onClick={() => navigate("/wallet")}
                className="w-full bg-white border border-gray-200 py-3.5 rounded-2xl text-gray-700 font-bold text-sm hover:bg-gray-50 active:scale-[0.99] transition-all cursor-pointer shadow-xs"
              >
                View Wallet History
              </button>
            </div>
          </div>
            {/* Dev-only debug panel to aid backend testing */}
          {import.meta.env.DEV && (
            <div className="px-4 pb-4">
              <div className="text-xs text-gray-500 font-medium mb-2">Debug</div>
              <div className="space-y-2">
                <pre className="text-[11px] p-2 bg-gray-50 rounded-md max-h-32 overflow-auto">{lastOrder ? JSON.stringify(lastOrder, null, 2) : "No order created yet"}</pre>
                <pre className="text-[11px] p-2 bg-gray-50 rounded-md max-h-32 overflow-auto">{lastVerify ? JSON.stringify(lastVerify, null, 2) : "No verify response yet"}</pre>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(lastOrder || {})); }} className="px-3 py-2 bg-gray-100 rounded-md text-xs">Copy Order</button>
                  <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(lastVerify || {})); }} className="px-3 py-2 bg-gray-100 rounded-md text-xs">Copy Verify</button>
                  <button onClick={retryVerify} className="px-3 py-2 bg-orange-50 text-[#FF6F3D] rounded-md text-xs">Retry Verify</button>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Success Modal */}
          {txnModalOpen && txnDetails && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#1d2340]">Payment Successful</h3>
                    <p className="text-sm text-gray-500 mt-1">Your payment has been received.</p>
                  </div>
                  <button onClick={() => setTxnModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-bold">₹{Number(txnDetails.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment ID</span>
                    <div className="text-xs text-right">
                      <div className="font-mono text-[12px] text-gray-800">{txnDetails.paymentId}</div>
                      <button onClick={() => navigator.clipboard?.writeText(txnDetails.paymentId)} className="text-[11px] text-gray-500 mt-1">Copy</button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID</span>
                    <div className="text-xs text-right">
                      <div className="font-mono text-[12px] text-gray-800">{txnDetails.orderId}</div>
                      <button onClick={() => navigator.clipboard?.writeText(txnDetails.orderId)} className="text-[11px] text-gray-500 mt-1">Copy</button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date</span>
                    <span className="text-gray-600">{txnDetails.date}</span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button onClick={() => { setTxnModalOpen(false); navigate('/wallet'); }} className="flex-1 bg-white border border-gray-200 py-3 rounded-xl text-sm font-bold">View Wallet</button>
                  <button onClick={() => setTxnModalOpen(false)} className="flex-1 bg-[#FF6F3D] text-white py-3 rounded-xl text-sm font-extrabold">Done</button>
                </div>
              </div>
            </div>
          )}
          <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
          <Bottomnav />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[430px] h-screen bg-[#FAFAFA] relative shadow-xl flex flex-col justify-between overflow-hidden">

        {/* Main Content (fits above Bottomnav) */}
        <div className="flex-1">

          {/* Header */}
          <div className="bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3 sticky top-0 z-10">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer mr-3"
              >
                <ArrowLeft size={24} className="text-gray-700" />
              </button>
              <h1 className="text-lg font-extrabold text-[#1d2340]">Add Money</h1>
            </div>

            <button
              onClick={() => navigate("/wallet")}
              className="inline-flex items-center gap-2 bg-white border border-orange-200 px-3.5 py-1 rounded-full shadow-sm text-sm font-bold text-[#FF6F3D] hover:bg-orange-50 transition-colors"
            >
              <WalletIcon size={18} className="text-[#FF6F3D]" />
              Astro Wallet
            </button>
          </div>

          <div className="px-4 py-3 space-y-4">

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-[#FFF2EC] to-[#FFE5D8] rounded-[28px] p-4 shadow-sm border border-[#FFF2EC] flex items-center justify-between relative overflow-hidden">
              <div className="space-y-2 z-10">
                <span className="text-xs font-bold text-gray-500 tracking-wide uppercase">Current Balance</span>
                <div className="text-3xl font-extrabold text-[#1d2340]">
                  ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="w-16 h-16 flex-shrink-0 z-10">
                <img
                  src={walletIllustration}
                  alt="Wallet"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Quick Amount Section (2 rows x 3 cols) */}
            <div className="space-y-2.5">
              <h2 className="font-bold text-gray-800 text-[14px] px-1">Quick Amount</h2>
              <div className="grid grid-cols-3 gap-3">
                {quickAmounts.map((amount) => {
                  const isSelected = inputAmount === amount.toString();
                  return (
                    <button
                      key={amount}
                      onClick={() => setInputAmount(amount.toString())}
                      className={`w-full py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? "border-[#FF6F3D] bg-[#FFF2EC] text-[#FF6F3D] shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      ₹{amount.toLocaleString("en-IN")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Enter Amount Section */}
            <div className="space-y-2.5">
              <h2 className="font-bold text-gray-800 text-[14px] px-1">Enter Amount</h2>
              <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200/60 p-3 flex items-center">
                <span className="text-lg font-bold text-gray-500 mr-2">₹</span>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-base font-bold text-gray-800 placeholder-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <p className="text-[10px] text-gray-400 px-1 font-medium">
                💡 Money added is immediately credited to your wallet balance.
              </p>
            </div>

            {/* Payment options are shown in Razorpay Checkout; UI shortcuts removed */}

            {/* Secure Payment Info */}
            <div className="bg-gray-100/70 border border-gray-200/20 rounded-2xl p-2.5 flex items-center gap-2 justify-center">
              <ShieldCheck size={18} className="text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500">Your payments are secure and encrypted</span>
            </div>

            {/* Action Proceed Button */}
            <button
              onClick={() => {
                // Use Razorpay checkout for real payments
                handleRazorpay();
              }}
              disabled={loading}
              className="w-full bg-[#FF6F3D] hover:bg-[#e05e30] py-3 rounded-2xl text-white font-extrabold text-sm shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding Money...
                </>
              ) : (
                <>
                  <Lock size={16} strokeWidth={2.5} />
                  Proceed to Add ₹{parseFloat(inputAmount || 0).toLocaleString("en-IN")}
                </>
              )}
            </button>

          </div>
        </div>

        {/* Toast + Bottom Navigation */}
        <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, show: false })} />
        <Bottomnav />

      </div>
    </div>
  );
}
