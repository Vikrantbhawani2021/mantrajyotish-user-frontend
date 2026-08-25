import React, { useState, useEffect } from "react";
import { useAstrologerPresence } from "../hooks/useAstrologerPresence";
import { CheckCircle, Star, Phone, Video, MessageCircle, Briefcase, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getBalance } from "../api/wallet";
import { requestVideoSession } from "../api/astro";
import InsufficientBalanceModal from "./InsufficientBalanceModal";
import { BACKEND_URL } from "../config/backend";

export default function AstrologerProfilePopup({ astrologer, onClose }) {
  const navigate = useNavigate();
  const { isLoggedIn, triggerLoginModal } = useAuth();
  
  // Real-time status sync via Socket-based presence hook
  const astroId = astrologer.id || astrologer._id;
  const presenceStatus = useAstrologerPresence(astroId);
  const isAvailable = presenceStatus === "ONLINE";

  // Modal and error states
  const [loadingCall, setLoadingCall] = useState(null); // "AUDIO" | "VIDEO" | null
  const [insufficient, setInsufficient] = useState({ open: false, message: "" });
  const [customPopup, setCustomPopup] = useState(null); // { title, message, type }

  // Dynamic session statistics and unique reviewers state
  const [stats, setStats] = useState({
    chats: 0,
    audioCalls: 0,
    videoCalls: 0,
    totalReviews: 0,
    uniqueReviewers: 0,
    loading: true
  });

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/astro/reviews/${astroId}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && active) {
          const reviews = json.data;
          
          // Calculate session counts from reviews
          const chatCount = reviews.filter(r => r.type === "Chat").length;
          const audioCount = reviews.filter(r => r.type === "AUDIO" || r.type === "Call").length;
          const videoCount = reviews.filter(r => r.type === "VIDEO").length;
          
          const uniqueNames = new Set(reviews.map(r => r.name).filter(Boolean));

          setStats({
            chats: chatCount,
            audioCalls: audioCount,
            videoCalls: videoCount,
            totalReviews: reviews.length,
            uniqueReviewers: uniqueNames.size,
            loading: false
          });
        } else if (active) {
          setStats(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.warn("Failed to fetch reviews for stats:", err);
        if (active) {
          setStats(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchStats();
    return () => {
      active = false;
    };
  }, [astroId]);

  // Real statistical values directly from the database reviews
  const displayChats = stats.chats;
  const displayAudio = stats.audioCalls;
  const displayVideo = stats.videoCalls;
  
  const displayTotalReviews = stats.totalReviews || astrologer.totalReviews || 0;
  const displayUniqueReviewers = stats.uniqueReviewers;

  // Normalize astrologer fields for compatibility across Call and Chat contexts
  const rawExperience = astrologer.experience || astrologer.exp || "5 Years";
  const cleanExpMatch = String(rawExperience).match(/\d+\s*\+?/);
  const cleanExperienceText = cleanExpMatch ? `${cleanExpMatch[0].trim()} Years` : String(rawExperience).replace(/experience/gi, "").trim();

  const normalizedAstro = {
    ...astrologer,
    id: astroId,
    _id: astroId,
    name: astrologer.name || "Astrologer",
    skills: astrologer.skills || astrologer.skill || "Kundli, Vastu, Marriage",
    skill: astrologer.skills || astrologer.skill || "Kundli, Vastu, Marriage",
    experience: cleanExperienceText,
    exp: cleanExperienceText,
    rating: astrologer.rating !== undefined && astrologer.rating !== null ? String(astrologer.rating) : "0",
    totalReviews: astrologer.totalReviews || astrologer.ratingCount || 0,
    price: astrologer.price || "₹9/min",
    priceRaw: astrologer.priceRaw || parseInt(astrologer.price?.replace(/[^\d]/g, "")) || 9,
    image: astrologer.image || astrologer.profileImage || `https://i.pravatar.cc/200?img=1`,
  };

  const showCustomPopup = (title, message, type = "info") => {
    setCustomPopup({ title, message, type });
  };

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
      return parseFloat(localStorage.getItem("wallet_balance") || "0");
    }
  };

  const handleStartCall = async (type) => {
    const featureLabel = type === "VIDEO" ? "Video Call" : "Audio Call";
    if (!isLoggedIn) {
      onClose();
      triggerLoginModal(featureLabel, window.location.pathname);
      return;
    }

    const rate = normalizedAstro.priceRaw;
    setLoadingCall(type);

    try {
      const cachedBal = parseFloat(localStorage.getItem("wallet_balance") || "0");
      if (cachedBal < rate) {
        setInsufficient({
          open: true,
          message: `You need at least ₹${rate} in your wallet to connect with ${normalizedAstro.name}.`,
        });
        setLoadingCall(null);
        return;
      }

      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userObj._id || userObj.id || userObj.userId || localStorage.getItem("phone") || "user_client";

      let resData;
      try {
        resData = await requestVideoSession({
          userId,
          astrologerId: astroId,
          callType: type,
          walletBalance: cachedBal,
        });

        if (!resData || !resData.success) {
          const lowerMsg = (resData?.message || "").toLowerCase();
          if (lowerMsg.includes("balance") || lowerMsg.includes("fund") || lowerMsg.includes("insufficient")) {
            const freshBal = await getWalletBalance();
            setInsufficient({
              open: true,
              message: `You need at least ₹${rate} in your wallet. Current Balance: ₹${freshBal.toFixed(2)}`,
            });
          } else {
            showCustomPopup(
              resData?.message?.includes("offline") ? "Astrologer Offline" : "Request Failed",
              resData?.message || "Failed to initiate call. Please try again.",
              "error"
            );
          }
          setLoadingCall(null);
          return;
        }
      } catch (fetchErr) {
        console.error("Call API Request Error:", fetchErr);
        showCustomPopup("Network Error", "Unable to connect to service. Please check your network and try again.", "error");
        setLoadingCall(null);
        return;
      }

      // Close profile popup before navigation to prevent layering issues
      onClose();

      const sId = resData.data?._id || resData.data?.sessionId;
      const pathType = type === "VIDEO" ? "video" : "call";
      navigate(`/${pathType}/${sId}`, {
        state: {
          astrologer: normalizedAstro,
          callType: type,
          sessionId: sId,
          channelName: resData.data?.channelName || `call_${sId}`,
          isMock: false,
        },
      });
    } catch (err) {
      console.error("Start Call Error:", err);
      showCustomPopup("Error", "An unexpected error occurred. Please try again.", "error");
      setLoadingCall(null);
    } finally {
      setLoadingCall(null);
    }
  };

  const handleStartChat = () => {
    if (!isLoggedIn) {
      onClose();
      triggerLoginModal("Chat", window.location.pathname);
      return;
    }

    onClose();
    navigate(`/chat-session/${normalizedAstro.name}`, {
      state: {
        astrologer: normalizedAstro,
        sessionId: null,
      },
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 backdrop-blur-[2px]"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="w-full max-w-[430px] bg-white rounded-t-[32px] shadow-2xl overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh]">
          {/* Orange Profile Header */}
          <div className="relative bg-gradient-to-r from-orange-500 to-orange-400 px-5 pt-5 pb-16 shrink-0">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition cursor-pointer"
              aria-label="Close profile"
            >
              <X size={21} />
            </button>

            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={normalizedAstro.image}
                  alt={normalizedAstro.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
                {/* Online/Busy/Offline Indicator Dot */}
                <span
                  className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-white ${
                    presenceStatus === "ONLINE"
                      ? "bg-green-500"
                      : presenceStatus === "BUSY"
                      ? "bg-amber-500"
                      : "bg-gray-400"
                  }`}
                />
              </div>

              <div className="flex items-center gap-1 mt-3">
                <h2 className="text-xl font-bold text-white text-center">
                  {normalizedAstro.name}
                </h2>
                <CheckCircle size={16} className="text-white fill-green-500 shrink-0" />
              </div>



              {normalizedAstro.tag && (
                <span className="mt-2 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide uppercase">
                  {normalizedAstro.tag}
                </span>
              )}
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="-mt-10 relative mx-4 bg-white rounded-[25px] shadow-md border border-gray-100 p-4 shrink-0 z-10">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="text-center px-1">
                <div className="flex justify-center items-center gap-1 flex-wrap">
                  <Star size={16} className="fill-orange-400 text-orange-400 shrink-0" />
                  <span className="font-bold text-[#1d2340] text-sm">
                    {normalizedAstro.rating} <span className="text-[10px] text-gray-400 font-medium">({displayTotalReviews})</span>
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Rating</p>
              </div>

              <div className="text-center px-1">
                <div className="flex justify-center items-center gap-1">
                  <Briefcase size={16} className="text-orange-500 shrink-0" />
                  <span className="font-bold text-[#1d2340] truncate">
                    {normalizedAstro.experience}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Experience</p>
              </div>

              <div className="text-center px-1">
                <p className="font-bold text-orange-500 truncate">
                  {normalizedAstro.price}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">Consultation</p>
              </div>
            </div>
          </div>

          {/* Scrollable details */}
          <div className="px-5 pt-5 pb-6 overflow-y-auto flex-1">
            <h3 className="font-bold text-[#1d2340] text-lg">About Astrologer</h3>
            <p className="text-sm text-gray-500 leading-relaxed mt-2 text-left whitespace-pre-line">
              {normalizedAstro.about || normalizedAstro.introduction || "No biography details added by the astrologer yet."}
            </p>

            {/* Expertise pills */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Expertise
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {normalizedAstro.skills.split(",").map((skill) => {
                  const cleanSkill = skill.trim();
                  return (
                    <span
                      key={cleanSkill}
                      className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold"
                    >
                      {cleanSkill}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Live Status Description Box */}
            <div className="mt-5 bg-gray-50 rounded-2xl p-3 flex items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  presenceStatus === "ONLINE"
                    ? "bg-green-500"
                    : presenceStatus === "BUSY"
                    ? "bg-amber-500"
                    : "bg-gray-400"
                }`}
              />
              <div>
                <p className="text-sm font-semibold text-[#1d2340]">
                  {presenceStatus === "ONLINE"
                    ? "Available Now"
                    : presenceStatus === "BUSY"
                    ? "Currently Busy"
                    : "Currently Offline"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {presenceStatus === "ONLINE"
                    ? "Ready for consultation"
                    : presenceStatus === "BUSY"
                    ? "Astrologer is on another consultation"
                    : "Please try again later"}
                </p>
              </div>
            </div>

            {/* Consultation Breakdown */}
            <div className="mt-5 bg-gray-50/50 border border-gray-100 rounded-2xl p-4 text-left">
              <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">
                Consultation History
              </h4>
              
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-xs">
                  <p className="text-xs font-bold text-gray-400">💬 Chats</p>
                  <p className="text-sm font-extrabold text-[#1d2340] mt-1">{displayChats}</p>
                </div>
                <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-xs">
                  <p className="text-xs font-bold text-gray-400">📞 Audio</p>
                  <p className="text-sm font-extrabold text-[#1d2340] mt-1">{displayAudio}</p>
                </div>
                <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-xs">
                  <p className="text-xs font-bold text-gray-400">📹 Video</p>
                  <p className="text-sm font-extrabold text-[#1d2340] mt-1">{displayVideo}</p>
                </div>
              </div>

              <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 justify-center mt-1 bg-white/70 py-1.5 rounded-lg border border-gray-100/50">
                <span>👥 Unique clients who rated:</span>
                <span className="text-orange-500 font-extrabold">{displayUniqueReviewers}</span>
                <span className="text-gray-300">|</span>
                <span>Total reviews left:</span>
                <span className="text-orange-500 font-extrabold">{displayTotalReviews}</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <button
                disabled={!isAvailable || loadingCall !== null}
                onClick={() => handleStartCall("AUDIO")}
                className="h-12 rounded-2xl bg-green-500 text-white flex items-center justify-center gap-2 font-semibold text-sm disabled:bg-gray-200 disabled:text-gray-400 transition active:scale-95 cursor-pointer"
              >
                <Phone size={16} />
                <span>Call</span>
              </button>

              <button
                disabled={!isAvailable || loadingCall !== null}
                onClick={() => handleStartCall("VIDEO")}
                className="h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center gap-2 font-semibold text-sm disabled:bg-gray-200 disabled:text-gray-400 transition active:scale-95 cursor-pointer"
              >
                <Video size={16} />
                <span>Video</span>
              </button>

              <button
                disabled={!isAvailable}
                onClick={handleStartChat}
                className="h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center gap-2 font-semibold text-sm disabled:bg-gray-200 disabled:text-gray-400 transition active:scale-95 cursor-pointer"
              >
                <MessageCircle size={16} />
                <span>Chat</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Insufficient Balance Popup */}
      <InsufficientBalanceModal
        open={insufficient.open}
        onClose={() => setInsufficient({ open: false, message: "" })}
        message={insufficient.message}
      />

      {/* Custom Error Alerts */}
      {customPopup && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[999] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] w-full max-w-[320px] p-6 text-center shadow-2xl animate-fade-in flex flex-col items-center">
            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center shadow-inner mt-2 ${
              customPopup.type === "error" 
                ? "bg-red-50 border-red-100/50" 
                : "bg-orange-50 border-orange-100/50"
            }`}>
              {customPopup.type === "error" ? (
                <span className="text-3xl text-red-500 font-bold leading-none">✕</span>
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
              onClick={() => setCustomPopup(null)}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-extrabold text-sm rounded-2xl shadow-lg mt-6 active:scale-95 transition-all cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
}
