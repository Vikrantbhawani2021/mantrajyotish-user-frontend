import React, { useState } from "react";
import { useAstrologerPresence } from "../hooks/useAstrologerPresence";
import { CheckCircle, Star, Phone, Video, Wallet, X, AlertTriangle, Briefcase, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { BACKEND_URL } from "../config/backend";
import { getBalance } from "../api/wallet";
import { requestVideoSession } from "../api/astro";

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
  const presenceStatus = useAstrologerPresence(item?.id || item?._id);
  const { isLoggedIn, triggerLoginModal } = useAuth();
  const navigate = useNavigate();
  const [loadingCall, setLoadingCall] = useState(null); // "AUDIO" | "VIDEO" | null
  const [rechargeModal, setRechargeModal] = useState(null); // { rate, currentBalance }
  const [customPopup, setCustomPopup] = useState(null); // { title, message, type, onConfirm }
  const showCustomPopup = (title, message, type = "info", onConfirm = null) => {
    setCustomPopup({ title, message, type, onConfirm });
  };

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
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userObj._id || userObj.id || userObj.userId || localStorage.getItem("phone") || "";
      const query = userId ? `userId=${userId}` : "";
      const res = await getBalance(query);
      const bal = res?.data?.walletBalance ?? res?.data?.balance ?? parseFloat(localStorage.getItem("wallet_balance") || "0");
      localStorage.setItem("wallet_balance", Number(bal).toFixed(2));
      return Number(bal);
    } catch (e) {
      const effective = parseFloat(localStorage.getItem("wallet_balance") || "0");
      return effective;
    }
  };

  const handleStartCall = async (type) => {
    if (!isLoggedIn) {
      triggerLoginModal(`${type === "VIDEO" ? "Video" : "Audio"} Call`, "/call");
      return;
    }

    const priceCleaned = data.priceRaw || parseInt(data.price?.replace(/[^\d]/g, "")) || 0;

    setLoadingCall(type);

    try {
      // Step 1: Ensure user has sufficient balance to connect call
      let currentBalance = await getWalletBalance();
      if (currentBalance < priceCleaned) {
        setRechargeModal({ rate: priceCleaned, currentBalance });
        setLoadingCall(null);
        return;
      }

      // Step 2: Proceed with call request
      const token = localStorage.getItem("authToken");
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userObj._id || userObj.id || userObj.userId || localStorage.getItem("phone") || "user_client";
      const astroId = data.id || data._id;

      let response;
      let resData;
      let isMock = false;

      try {
        // Use API helper to request video session
        resData = await requestVideoSession({ userId, astrologerId: astroId, callType: type, walletBalance: currentBalance });

        if (!resData || !resData.success) {
          showCustomPopup(
            resData?.message?.includes("offline") ? "Astrologer Offline" : "Request Failed", 
            resData?.message || "Failed to initiate call. Please try again.", 
            "error"
          );
          setLoadingCall(null);
          return;
        }
      } catch (fetchErr) {
        console.error("Failed to connect to backend for call request:", fetchErr);
        showCustomPopup("Network Error", "Network error. Please check your connection and try again.", "error");
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
      showCustomPopup("Error", "An unexpected error occurred. Please try again.", "error");
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

      <div className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,0.02)] border border-gray-100 p-3 flex justify-between gap-3 w-full hover:shadow-[0_10px_26px_rgba(0,0,0,0.05)] hover:scale-[1.01] transition-all duration-300">

        {/* Column 1 & Column 2 Wrapper */}
        <div className="flex gap-3 flex-1 min-w-0">
          
          {/* Column 1: Image + Rating & Price Row */}
          <div className="flex flex-col items-center flex-shrink-0 gap-2">
            <div className="relative">
              {data.tag && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#ff7448] text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider shadow-xs z-10">
                  {data.tag}
                </span>
              )}
              <div className="w-16 h-16 rounded-[16px] overflow-hidden border border-orange-100 shadow-inner relative">
                <img
                  src={data.image}
                  alt={data.name}
                  className="w-full h-full object-cover"
                />
                
                {/* Diagonal Status Ribbon (top-left of avatar) */}
                {(() => {
                  let ribbonBg = "bg-green-500";
                  let ribbonText = "ONLINE";

                  if (presenceStatus === "OFFLINE") {
                    ribbonBg = "bg-gray-400";
                    ribbonText = "OFFLINE";
                  } else if (presenceStatus === "BUSY") {
                    ribbonBg = "bg-amber-500";
                    ribbonText = "BUSY";
                  }

                  return (
                    <div 
                      className={`absolute top-0 left-0 w-14 h-3.5 -translate-x-4 translate-y-1 -rotate-45 flex items-center justify-center ${ribbonBg} z-1 shadow-xs`}
                      title={ribbonText}
                    >
                      <span className="text-[5.5px] font-extrabold text-white tracking-wider leading-none text-center">
                        {ribbonText}
                      </span>
                    </div>
                  );
                })()}
              </div>
              
              {/* Status Indicator Dot (bottom-right of avatar) */}
              {(() => {
                let dotColor = "bg-[#2EA248]"; // Default Online Green
                let statusTitle = "Online";

                if (presenceStatus === "OFFLINE") {
                  dotColor = "bg-gray-400"; // Offline Grey
                  statusTitle = "Offline";
                } else if (presenceStatus === "BUSY") {
                  dotColor = "bg-amber-500"; // Busy Yellow/Amber
                  statusTitle = "Busy";
                }

                return (
                  <span
                    className={`absolute bottom-0.5 right-0.5 w-3 h-3 border-2 border-white rounded-full z-1 shadow-xs ${dotColor}`}
                    title={statusTitle}
                  />
                );
              })()}
            </div>

            {/* Rating Stars + Numerical Value underneath the image */}
            <div className="flex flex-col items-center mt-1.5 justify-center">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const ratingVal = parseFloat(data.rating || 5);
                  const isFilled = starIndex <= Math.round(ratingVal);
                  return (
                    <Star
                      key={starIndex}
                      size={9}
                      className={isFilled ? "fill-yellow-400 text-yellow-400 flex-shrink-0" : "text-gray-300 flex-shrink-0"}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] font-bold text-gray-500 mt-0.5">{data.rating}</span>
            </div>
          </div>

          {/* Column 2: Info Details */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
            
            {/* Name + Verified Row (Online badge removed) */}
            <div className="flex items-center gap-1 flex-wrap min-w-0">
              <h2 className="font-bold text-[#1d2340] text-sm leading-tight truncate">
                {data.name}
              </h2>
              <CheckCircle
                size={12}
                className="text-[#2EA248] fill-[#EBF7EE] flex-shrink-0"
              />
            </div>

            {/* Follow Button */}
            <div className="flex mt-0.5">
              <button
                onClick={handleToggleFollow}
                className={`text-[8.5px] font-bold px-2 py-0.5 rounded-md transition-all uppercase tracking-wider cursor-pointer active:scale-95 flex items-center gap-0.5 ${
                  isFollowed
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : "bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100"
                }`}
              >
                {isFollowed ? "Following" : "+ Follow"}
              </button>
            </div>

            {/* Specialization List */}
            <p className="text-[10px] text-gray-500 leading-snug font-medium mt-0.5 line-clamp-2">
              {data.skills || data.skill}
            </p>

            {/* Experience Icons Row */}
            <div className="flex items-center gap-1 text-[9px] text-gray-400 font-semibold mt-1 flex-wrap min-w-0">
              <div className="flex items-center gap-0.5 min-w-0">
                <Briefcase size={11} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">EXP: {data.experience?.toUpperCase().replace(" EXPERIENCE YEARS", "").replace(" YEARS", "") || "5"}+ YRS</span>
              </div>
              <span className="text-gray-200 font-light">|</span>
              <div className="flex items-center gap-0.5 min-w-0">
                <Calendar size={11} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">EXPERIENCE YEARS</span>
              </div>
            </div>

          </div>

        </div>

        {/* Column 3: Price & Action Buttons */}
        <div className="flex flex-col gap-1.5 justify-center items-center flex-shrink-0">
          {/* Price displayed above Audio call button */}
          <span className="font-extrabold text-[#ff7448] text-xs mb-0.5">
            {data.price}
          </span>

          <button
            disabled={loadingCall !== null}
            onClick={() => handleStartCall("AUDIO")}
            className="w-[82px] h-[36px] rounded-[12px] bg-[#EBF7EE] text-[#2EA248] hover:bg-[#d8eedc] text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Phone size={11} className="fill-current" />
            <span>Audio</span>
          </button>

          <button
            disabled={loadingCall !== null}
            onClick={() => handleStartCall("VIDEO")}
            className="w-[82px] h-[36px] rounded-[12px] bg-[#FFF2EC] text-[#FF6F3D] hover:bg-[#ffe5d9] text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Video size={11} className="fill-current" />
            <span>Video</span>
          </button>
        </div>

      </div>

      {/* Custom Notification Modal */}
      {customPopup && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[999] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] w-full max-w-[320px] p-6 text-center shadow-2xl animate-fade-in flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center shadow-inner mt-2 ${
              customPopup.type === "error" 
                ? "bg-red-50 border-red-100/50" 
                : customPopup.type === "warn"
                ? "bg-amber-50 border-amber-100/50"
                : "bg-orange-50 border-orange-100/50"
            }`}>
              {customPopup.type === "error" ? (
                <span className="text-3xl text-red-500 font-bold leading-none">✕</span>
              ) : customPopup.type === "warn" ? (
                <span className="text-3xl text-amber-500 font-bold leading-none">⚠️</span>
              ) : (
                <span className="text-3xl text-[#FF6F3D] font-bold leading-none">i</span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-800 mt-5 leading-tight">
              {customPopup.title}
            </h3>
            <p className="text-gray-500 text-xs mt-3 px-2 leading-relaxed">
              {customPopup.message}
            </p>
            <button
              onClick={() => {
                const onConfirm = customPopup.onConfirm;
                setCustomPopup(null);
                if (onConfirm) onConfirm();
              }}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-extrabold text-sm rounded-2xl shadow-lg mt-6 active:scale-95 transition-all cursor-pointer animate-fade-in"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AstrologerCard;