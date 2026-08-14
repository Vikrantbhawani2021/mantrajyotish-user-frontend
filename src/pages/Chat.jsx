import React, { useState, useEffect } from "react";
import { ArrowLeft, Search, Mic, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Bottomnav from "../component/Bottomnav";
import { useAuth } from "../context/AuthContext";

const mockAstrologers = [
  {
    id: "65b839cd49b29e00192e01a4",
    name: "Vikram",
    skill: "Kundli, Vastu, Marriage",
    exp: "8 Years",
    rating: "4.9",
    price: "₹15/min",
    priceRaw: 15,
    image: "https://i.pravatar.cc/200?img=33",
  },
  {
    id: "65b839cd49b29e00192e01a5",
    name: "Sumit",
    skill: "Love, Career, Marriage",
    exp: "5 Years",
    rating: "4.9",
    price: "₹20/min",
    priceRaw: 20,
    image: "https://i.pravatar.cc/200?img=12",
  },
  {
    id: "65b839cd49b29e00192e01a6",
    name: "Rahul",
    skill: "Vedic Astrology, Financial",
    exp: "3 Years",
    rating: "4.8",
    price: "₹18/min",
    priceRaw: 18,
    image: "https://i.pravatar.cc/200?img=68",
  },
  {
    id: "65b839cd49b29e00192e01a7",
    name: "Neha",
    skill: "Numerology, Love, Career",
    exp: "6 Years",
    rating: "5.0",
    price: "₹25/min",
    priceRaw: 25,
    image: "https://i.pravatar.cc/200?img=47",
  },
];

export default function Chat() {
  const navigate = useNavigate();
  const { isLoggedIn, triggerLoginModal } = useAuth();
  const [loadingAstro, setLoadingAstro] = useState(null);
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [followedAstro, setFollowedAstro] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("followedAstrologers")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchOnlineAstrologers = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/astro/all?online=true`);
        const resData = await response.json();
        if (response.ok && resData.success && resData.data && resData.data.length > 0) {
          const formatted = resData.data.map(astro => ({
            id: astro._id,
            name: astro.name || "Astrologer",
            skill: (astro.specialization && astro.specialization.join(", ")) || "Kundli, Vastu, Marriage",
            exp: astro.experience || "5 Years",
            rating: astro.rating || "4.8",
            price: astro.consultationFee ? `₹${astro.consultationFee}/min` : "₹15/min",
            priceRaw: astro.consultationFee || 15,
            image: astro.profileImage || `https://i.pravatar.cc/200?img=${Math.floor(Math.random() * 70) + 1}`,
          }));
          setAstrologers(formatted);
        } else {
          setAstrologers(mockAstrologers);
        }
      } catch (error) {
        console.error("Fetch astrologers error:", error);
        setAstrologers(mockAstrologers);
      } finally {
        setLoading(false);
      }
    };
    fetchOnlineAstrologers();
  }, []);

  const toggleFollow = (name) => {
    let updated;
    if (followedAstro.includes(name)) {
      updated = followedAstro.filter((n) => n !== name);
    } else {
      updated = [...followedAstro, name];
    }
    setFollowedAstro(updated);
    localStorage.setItem("followedAstrologers", JSON.stringify(updated));
  };

  const handleStartChat = async (item) => {
    if (!isLoggedIn) {
      triggerLoginModal("Chat", `/chat`);
      return;
    }

    setLoadingAstro(item.id);
    try {
      const token = localStorage.getItem("authToken");
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userObj._id || userObj.id || "";
      const userName = userObj.name ||
                       userObj.userName ||
                       (userObj.firstname ? `${userObj.firstname} ${userObj.lastname || ""}`.trim() : "") ||
                       localStorage.getItem("userName") ||
                       "";

      console.log("Starting chat request with payload:", {
        userId,
        astrologerId: item.id,
        name: userName,
        token: token ? `${token.substring(0, 15)}...` : "missing"
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/chat/initiate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: userId,
          astrologerId: item.id,
          name: userName,
          userName: userName
        })
      });

      const resData = await response.json();
      console.log("Chat initiate API response status:", response.status, resData);

      if (response.ok && resData.success) {
        // Navigate to the chat session screen, passing the created sessionId
        navigate(`/chat-session/${item.name}`, { 
          state: { 
            astrologer: item,
            sessionId: resData.data._id || resData.data.sessionId
          } 
        });
      } else {
        // Check if balance error or other
        if (resData.message && (resData.message.toLowerCase().includes("balance") || resData.message.toLowerCase().includes("wallet") || resData.message.toLowerCase().includes("insufficient"))) {
          alert(resData.message || "Insufficient wallet balance. Please recharge your wallet to start a chat.");
          navigate("/wallet");
        } else {
          alert(resData.message || `Failed to start chat session: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Start Chat Error:", error);
      alert(`Error starting chat: ${error.message}`);
    } finally {
      setLoadingAstro(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex justify-center">
      <div className="w-full max-w-[430px] bg-white min-h-screen shadow-xl relative overflow-hidden flex flex-col justify-between">

        {/* Scrollable Content */}
        <div className="overflow-y-auto h-screen pb-28">

          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-b-[35px] shadow-lg px-5 pt-12 pb-8 relative">
            <button
              onClick={() => navigate("/home")}
              className="absolute left-5 top-12 text-white cursor-pointer hover:opacity-80 transition-opacity"
            >
              <ArrowLeft size={26} />
            </button>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white">
                Chat with Astrologers
              </h1>
              <p className="text-orange-100 text-sm mt-1">
                Get instant guidance on love, marriage & career
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="px-5 mt-5">
            <div className="flex items-center bg-white border border-orange-100 rounded-full px-4 h-14 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 transition-all">
              <Search className="text-gray-400" size={20} />
              <input
                placeholder="Search for astrologers..."
                className="flex-1 bg-transparent outline-none px-3 text-base text-gray-700 placeholder-gray-400"
              />
              <Mic className="text-[#ff7448] cursor-pointer hover:scale-105 transition-transform" size={20} />
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-4 px-5 mt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <span className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-sm text-gray-500 font-medium">Finding online astrologers...</span>
              </div>
            ) : astrologers.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-sm">
                No active online astrologers found.
              </div>
            ) : (
              astrologers.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleStartChat(item)}
                  className="bg-white rounded-3xl shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-gray-100 p-4.5 cursor-pointer hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex items-center justify-between gap-3"
                >
                  {/* Left Details */}
                  <div className="flex gap-3.5 flex-1 min-w-0">
                    {/* Image with Online Status */}
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-orange-100 shadow-inner">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="font-bold text-[#1d2340] text-base leading-tight truncate">
                          {item.name}
                        </h2>
                        <span className="bg-[#FFF2EC] text-[#FF6F3D] text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          Online
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFollow(item.name);
                          }}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-all uppercase tracking-wider cursor-pointer active:scale-95 ${
                            followedAstro.includes(item.name)
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {followedAstro.includes(item.name) ? "Following" : "+ Follow"}
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {item.skill}
                      </p>

                      <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">
                        Exp: {item.exp}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-bold text-orange-500">
                          {item.price}
                        </span>
                        <span className="text-xs text-gray-400">
                          ★ {item.rating}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Button */}
                  <button
                    disabled={loadingAstro === item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChat(item);
                    }}
                    className="w-[96px] py-2.5 rounded-full bg-[#FFF2EC] text-[#FF6F3D] hover:bg-[#ffe5d9] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm shadow-orange-500/5 disabled:opacity-60"
                  >
                    <MessageCircle size={13} className="fill-current" />
                    {loadingAstro === item.id ? "..." : "Chat"}
                  </button>
                </div>
              ))
            )}
          </div>

        </div>

        {/* Bottom Navigation */}
        <Bottomnav />

      </div>
    </div>
  );
}