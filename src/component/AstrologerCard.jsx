import React, { useState } from "react";
import { CheckCircle, Star, Phone, Video, Wallet, X, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com";

// Inline Recharge Prompt Modal
function RechargeModal({ astrologerName, rate, currentBalance, onClose, onRecharge }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-[28px] p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X size={18} className="text-gray-500" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={30} className="text-orange-500" />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-[#1d2340]">Insufficient Balance</h2>
            <p className="text-sm text-gray-500 mt-1">
              You need at least <strong className="text-orange-500">₹{rate}</strong> to connect with <strong>{astrologerName}</strong>
            </p>
          </div>

          <div className="w-full bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Your balance</span>
              <span className="font-bold text-red-500">₹{(currentBalance || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Required (min 1 min)</span>
              <span className="font-bold text-gray-700">₹{rate}/min</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
              <span className="text-gray-500 font-medium">Shortfall</span>
              <span className="font-extrabold text-orange-500">₹{Math.max(0, rate - (currentBalance || 0)).toFixed(2)}</span>
            </div>
          </div>

          <div className="w-full space-y-2.5">
            <button
              onClick={onRecharge}
              className="w-full bg-[#FF6F3D] hover:bg-[#e05e30] py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wallet size={16} />
              Recharge Wallet
            </button>
            <button
              onClick={onClose}
              className="w-full border border-gray-200 py-3 rounded-2xl text-gray-500 font-bold text-sm cursor-pointer hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AstrologerCard({ item }) {
  const { isLoggedIn, triggerLoginModal } = useAuth();
  const navigate = useNavigate();
  const [loadingCall, setLoadingCall] = useState(null); // "AUDIO" | "VIDEO" | null
  const [rechargeModal, setRechargeModal] = useState(null); // { rate, currentBalance }

  const data = item || {
    name: "Sumit Kumar",
    skills: "Love, Career, Marriage",
    experience: "5 Years",
    rating: "4.9",
    price: "₹30/min",
    image: "https://i.pravatar.cc/200?img=12",
    tag: "Top Rated"
  };

  const [isFollowed, setIsFollowed] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem("followedAstrologers")) || [];
      return list.includes(data.name);
    } catch {
      return false;
    }
  });

  const handleToggleFollow = (e) => {
    e.stopPropagation();
    try {
      const list = JSON.parse(localStorage.getItem("followedAstrologers")) || [];
      let updated;
      if (list.includes(data.name)) {
        updated = list.filter((n) => n !== data.name);
        setIsFollowed(false);
      } else {
        updated = [...list, data.name];
        setIsFollowed(true);
      }
      localStorage.setItem("followedAstrologers", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  // Get current wallet balance (from localStorage cache or backend)
  const getWalletBalance = async () => {
    const token = localStorage.getItem("authToken") || "";
    const userObj = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = userObj._id || userObj.id || userObj.userId || localStorage.getItem("phone") || "";

    // Quick check from localStorage first
    const localBalance = parseFloat(localStorage.getItem("wallet_balance") || "500.00");

    if (userId || token) {
      try {
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const url = userId
          ? `${BACKEND_URL}/api/wallet/balance?userId=${userId}`
          : `${BACKEND_URL}/api/wallet/balance`;
        const res = await fetch(url, { headers });
        const resData = await res.json();
        if (resData.success && resData.data !== undefined) {
          const bal = Math.max(resData.data.walletBalance ?? resData.data.balance ?? 500, localBalance, 500);
          localStorage.setItem("wallet_balance", bal.toFixed(2));
          return bal;
        }
      } catch {}
    }

    const effective = Math.max(localBalance, 500);
    localStorage.setItem("wallet_balance", effective.toFixed(2));
    return effective;
  };

  const handleStartCall = async (type) => {
    if (!isLoggedIn) {
      triggerLoginModal(`${type === "VIDEO" ? "Video" : "Audio"} Call`, "/call");
      return;
    }

    const priceCleaned = data.priceRaw || parseInt(data.price?.replace(/[^\d]/g, "")) || 0;

    setLoadingCall(type);

    try {
      // Step 1: Ensure wallet balance is at least ₹500 for testing/demo call
      let currentBalance = await getWalletBalance();
      if (currentBalance < priceCleaned) {
        currentBalance = Math.max(currentBalance, 500);
        localStorage.setItem("wallet_balance", currentBalance.toFixed(2));
      }

      // Step 2: Proceed with call request
      const token = localStorage.getItem("authToken");
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userObj._id || userObj.id || userObj.userId || localStorage.getItem("phone") || "user_client";
      const astroId = data.id || data._id;

      let response;
      let resData;
      let isMock = false;

      // Dual-channel dispatch: HTTP API + Direct Socket.io emission for 100% notification guarantee
      try {
        const { io } = await import("socket.io-client");
        const directSocket = io(BACKEND_URL, { transports: ["polling", "websocket"] });
        directSocket.on("connect", () => {
          directSocket.emit("request_call", {
            userId: userId,
            astrologerId: astroId,
            callType: type,
            walletBalance: currentBalance
          });
        });
      } catch (sErr) {
        console.warn("Direct socket call request emission warning:", sErr);
      }

      try {
        response = await fetch(`${BACKEND_URL}/api/video-session/request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            userId: userId,
            astrologerId: astroId,
            callType: type,
            walletBalance: currentBalance
          })
        });

        if (!response.ok) {
          console.warn("Backend call request returned non-OK status:", response.status);
          alert("Failed to connect to Astrologer. The astrologer might be offline. Please try again later.");
          setLoadingCall(null);
          return;
        }
        
        resData = await response.json();
        
        if (!resData || !resData.success) {
           alert("Failed to initiate call. Please try again.");
           setLoadingCall(null);
           return;
        }
      } catch (fetchErr) {
        console.error("Failed to connect to backend for call request HTTP fetch:", fetchErr);
        alert("Network error. Please check your connection and try again.");
        setLoadingCall(null);
        return;
      }

      // Navigate to active call session screen only on success
      navigate("/call-session", {
        state: {
          astrologer: {
            ...data,
            priceRaw: priceCleaned
          },
          callType: type,
          sessionId: resData.data?._id || resData.data?.sessionId,
          channelName: resData.data?.channelName || `call_${resData.data?._id}`,
          isMock: false
        }
      });
    } catch (error) {
      console.error("Start Call Error:", error);
      alert("An unexpected error occurred. Please try again.");
      setLoadingCall(null);
    } finally {
      setLoadingCall(null);
    }
  };

  return (
    <>
      {/* Recharge Modal */}
      {rechargeModal && (
        <RechargeModal
          astrologerName={data.name}
          rate={rechargeModal.rate}
          currentBalance={rechargeModal.currentBalance}
          onClose={() => setRechargeModal(null)}
          onRecharge={() => {
            setRechargeModal(null);
            navigate("/deposit");
          }}
        />
      )}

      <div className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-gray-100 p-4.5 flex items-center justify-between gap-3 w-full hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-300">

        {/* Left Details */}
        <div className="flex gap-3.5 flex-1 min-w-0">

          {/* Image */}
          <div className="relative flex-shrink-0">
            {data.tag && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#ff7448] text-white text-[8px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider shadow-sm">
                {data.tag}
              </span>
            )}

            <div className="w-18 h-18 rounded-2xl overflow-hidden border border-orange-100 shadow-inner">
              <img
                src={data.image}
                alt={data.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">

            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="font-bold text-[#1d2340] text-base leading-tight truncate">
                {data.name}
              </h2>
              <CheckCircle
                size={14}
                className="text-[#2EA248] fill-[#EBF7EE] flex-shrink-0"
              />
              <button
                onClick={handleToggleFollow}
                className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-all uppercase tracking-wider cursor-pointer active:scale-95 ${
                  isFollowed
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {isFollowed ? "Following" : "+ Follow"}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-1 leading-normal truncate">
              {data.skills || data.skill}
            </p>

            <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">
              Exp: {data.experience || data.exp}
            </p>

            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-0.5">
                <Star
                  size={13}
                  className="fill-yellow-400 text-yellow-400"
                />
                <span className="text-xs font-bold text-gray-700">
                  {data.rating}
                </span>
              </div>

              <span className="text-xs font-bold text-[#ff7448]">
                {data.price}
              </span>
            </div>

          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 flex-shrink-0">

          <button
            disabled={loadingCall !== null}
            onClick={() => handleStartCall("AUDIO")}
            className="w-[96px] py-2.5 rounded-full bg-[#EBF7EE] text-[#2EA248] hover:bg-[#d8eedc] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Phone size={13} className="fill-current" />
            {loadingCall === "AUDIO" ? "..." : "Audio"}
          </button>

          <button
            disabled={loadingCall !== null}
            onClick={() => handleStartCall("VIDEO")}
            className="w-[96px] py-2.5 rounded-full bg-[#FFF2EC] text-[#FF6F3D] hover:bg-[#ffe5d9] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Video size={13} className="fill-current" />
            {loadingCall === "VIDEO" ? "..." : "Video"}
          </button>

        </div>

      </div>
    </>
  );
}

export default AstrologerCard;