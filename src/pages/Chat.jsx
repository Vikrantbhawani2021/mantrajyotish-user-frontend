import React, { useState, useEffect } from "react";
import { useAstrologerPresence } from "../hooks/useAstrologerPresence";
import { ArrowLeft, Search, Mic, MessageCircle, Star, CheckCircle, Briefcase, Calendar, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Bottomnav from "../component/Bottomnav";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../config/backend";
import { initiateChat } from "../api/chat";
import CategoryTabs from "../component/CategoryTabs";
import InsufficientBalanceModal from "../component/InsufficientBalanceModal";
import { io } from "socket.io-client";


function ChatAstrologerCard({ item, isFollowed, toggleFollow, handleStartChat, loadingAstro }) {
  const presenceStatus = useAstrologerPresence(item.id || item._id);

  return (
    <div
      onClick={() => handleStartChat(item)}
      className="bg-white rounded-[24px] shadow-[0_6px_20px_rgba(0,0,0,0.02)] border border-gray-100 p-3 flex justify-between gap-3 w-full hover:shadow-[0_10px_26px_rgba(0,0,0,0.05)] hover:scale-[1.01] transition-all duration-300 cursor-pointer"
    >
      {/* Column 1 & Column 2 Wrapper */}
      <div className="flex gap-3 flex-1 min-w-0">
        
        {/* Column 1: Image + Rating Row */}
        <div className="flex flex-col items-center flex-shrink-0 gap-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-[16px] overflow-hidden border border-orange-100 shadow-inner relative">
              <img
                src={item.image}
                alt={item.name}
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
                const ratingVal = parseFloat(item.rating || 5);
                const isFilled = starIndex <= Math.round(ratingVal);
                return (
                  <span key={starIndex} className={isFilled ? "text-yellow-400 text-[10px]" : "text-gray-300 text-[10px]"}>★</span>
                );
              })}
            </div>
            <span className="text-[10px] font-bold text-gray-500 mt-0.5">{item.rating}</span>
          </div>
        </div>

        {/* Column 2: Info Details */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
          
          {/* Name + Verified Row */}
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            <h2 className="font-bold text-[#1d2340] text-sm leading-tight truncate">
              {item.name}
            </h2>
            <CheckCircle
              size={12}
              className="text-[#2EA248] fill-[#EBF7EE] flex-shrink-0"
            />
          </div>

          {/* Follow Button */}
          <div className="flex mt-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFollow(item.name);
              }}
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
            {item.skill}
          </p>

          {/* Experience Icons Row */}
          <div className="flex items-center gap-1 text-[9px] text-gray-400 font-semibold mt-1 flex-wrap min-w-0">
            <div className="flex items-center gap-0.5 min-w-0">
              <span className="truncate">EXP: {item.exp?.toUpperCase().replace(" EXPERIENCE YEARS", "").replace(" YEARS", "") || "5"}+ YRS</span>
            </div>
          </div>

        </div>

      </div>

      {/* Column 3: Price & Action Buttons */}
      <div className="flex flex-col gap-1.5 justify-center items-center flex-shrink-0 ml-auto">
        {/* Price displayed above Chat button */}
        <span className="font-extrabold text-[#ff7448] text-xs mb-0.5">
          {item.price}
        </span>

        <button
          disabled={loadingAstro === item.id}
          onClick={(e) => {
            e.stopPropagation();
            handleStartChat(item);
          }}
          className="w-[82px] h-[36px] rounded-[12px] bg-[#FFF2EC] text-[#FF6F3D] hover:bg-[#ffe5d9] text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <span>Chat</span>
        </button>
      </div>

    </div>
  );
}

function SkeletonChatCard() {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 p-3 flex justify-between gap-3 w-full animate-pulse text-left">
      {/* Column 1 & Column 2 Wrapper */}
      <div className="flex gap-3 flex-1 min-w-0">
        
        {/* Column 1: Avatar + Rating */}
        <div className="flex flex-col items-center flex-shrink-0 gap-2">
          <div className="w-16 h-16 rounded-[16px] bg-gray-200" />
          <div className="w-12 h-3 bg-gray-200 rounded-full mt-1.5" />
          <div className="w-8 h-2.5 bg-gray-100 rounded-full mt-1" />
        </div>

        {/* Column 2: Details */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">
          {/* Name */}
          <div className="w-24 h-4 bg-gray-200 rounded-md" />
          {/* Follow Button */}
          <div className="w-12 h-3 bg-gray-100 rounded-md mt-0.5" />
          {/* Skills */}
          <div className="w-36 h-3 bg-gray-200 rounded-md mt-1" />
          <div className="w-20 h-3 bg-gray-100 rounded-md mt-0.5" />
          {/* Experience */}
          <div className="w-24 h-2.5 bg-gray-200 rounded-md mt-1" />
        </div>

      </div>

      {/* Column 3: Price & Chat Button */}
      <div className="flex flex-col gap-1.5 justify-center items-center flex-shrink-0 ml-auto">
        {/* Price */}
        <div className="w-10 h-3 bg-gray-200 rounded-md mb-1.5" />
        {/* Chat Button */}
        <div className="w-[82px] h-[36px] rounded-[12px] bg-gray-200" />
      </div>
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const { isLoggedIn, triggerLoginModal } = useAuth();
  const [loadingAstro, setLoadingAstro] = useState(null);
  const [astrologers, setAstrologers] = useState([]);
  const [allAstrologers, setAllAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [insufficient, setInsufficient] = useState({ open: false, message: "" });

  // Filter States
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [filterOnline, setFilterOnline] = useState(false);
  const [filterFollowing, setFilterFollowing] = useState(false);

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
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${BACKEND_URL}/api/astro/all`, {
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          }
        });
        const resData = await response.json();
        const list = resData.data || (Array.isArray(resData) ? resData : []);
        if (response.ok && resData.success && list && list.length > 0) {
          const formatted = list.map(astro => ({
            id: astro._id || astro.id,
            name: astro.name || "Astrologer",
            isOnline: astro.isOnline ?? true,
            isAvailable: astro.isAvailable ?? true,
            skill: (astro.specialization && Array.isArray(astro.specialization) ? astro.specialization.join(", ") : astro.specialization) || "Kundli, Vastu, Marriage",
            exp: astro.experience ? `${astro.experience} Years` : "5 Years",
            rating: astro.rating ? String(astro.rating) : "4.8",
            price: "₹9/min",
            priceRaw: 9,
            image: astro.profileImage || `https://i.pravatar.cc/200?img=${Math.floor(Math.random() * 70) + 1}`,
          }));
          setAllAstrologers(formatted);
          setAstrologers(formatted);
        } else {
          setAllAstrologers([]);
          setAstrologers([]);
        }
      } catch (error) {
        console.error("Fetch astrologers error:", error);
        setAllAstrologers([]);
        setAstrologers([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOnlineAstrologers();
    // Re-fetch listing every 20 seconds for real-time status updates
    const interval = setInterval(fetchOnlineAstrologers, 20000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time status change broadcast from socket
  useEffect(() => {
    let socket;
    try {
      socket = io(BACKEND_URL, {
        transports: ["polling", "websocket"]
      });
      socket.on("connect", () => {
        console.log("🔌 Connected to live status sync socket for Chat list");
      });
      socket.on("astrologer_status_changed", (updatedData) => {
        console.log("⚡ Real-time status update received:", updatedData);
        const updateStatus = (list) =>
          list.map((astro) =>
            astro.id === updatedData.astrologerId
              ? { ...astro, isOnline: updatedData.isOnline, isAvailable: updatedData.isAvailable }
              : astro
          );
        setAllAstrologers((prev) => updateStatus(prev));
        setAstrologers((prev) => updateStatus(prev));
      });
    } catch (err) {
      console.error("Failed to connect live status socket:", err);
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Multi-criteria live search and filter logic
  useEffect(() => {
    let filtered = [...allAstrologers];

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.skill || "").toLowerCase().includes(q)
      );
    }

    // 2. Category Tab Filter
    if (activeCategory !== "All") {
      const cat = activeCategory.toLowerCase();
      filtered = filtered.filter((a) =>
        (a.skill || "").toLowerCase().includes(cat)
      );
    }

    // 3. Online Status Filter
    if (filterOnline) {
      filtered = filtered.filter((a) => a.isOnline === true && a.isAvailable === true);
    }

    // 4. Following Filter
    if (filterFollowing) {
      filtered = filtered.filter((a) => followedAstro.includes(a.name));
    }

    setAstrologers(filtered);
  }, [searchQuery, activeCategory, filterOnline, filterFollowing, allAstrologers, followedAstro]);

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

    // Directly navigate to ChatSession screen without initiating session yet
    navigate(`/chat-session/${item.name}`, {
      state: {
        astrologer: item,
        sessionId: null
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex justify-center">

      {/* Mobile Container with fixed height to contain inner scrolling */}
      <div className="w-full max-w-[430px] bg-white h-screen h-[100dvh] shadow-xl relative overflow-hidden flex flex-col justify-between">

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pb-28">

          {/* 1. Header Title Block (Scrolls away) */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-5 pt-10 pb-6 relative text-center">
            <button
              onClick={() => navigate("/home")}
              className="absolute left-5 top-10 text-white cursor-pointer hover:opacity-80 transition-opacity"
            >
              <ArrowLeft size={26} />
            </button>

            <div className="mb-1">
              <h1 className="text-2xl font-bold text-white">
                Chat with Astrologers
              </h1>
              <p className="text-orange-100 text-sm mt-1">
                Get instant guidance on love, marriage &amp; career
              </p>
            </div>
          </div>

          {/* 2. Sticky Search Bar & Filters Container (Sticks to top-0) */}
          <div className="sticky top-0 z-30 bg-gradient-to-r from-orange-500 to-orange-400 rounded-b-[24px] px-5 pb-5 pt-2 shadow-md flex flex-col gap-3">
            <div className="flex items-center bg-white border border-orange-100 rounded-full px-4 h-12 shadow-md focus-within:ring-2 focus-within:ring-orange-400 transition-all">
              <Search className="text-gray-400 flex-shrink-0" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search astrologers..."
                className="flex-1 min-w-0 bg-transparent outline-none px-3 text-sm text-gray-700 placeholder-gray-400"
              />
              {/* Filter Action Icon */}
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className="text-gray-400 hover:text-orange-500 transition-colors p-1 cursor-pointer flex-shrink-0"
                title="Toggle Filters"
              >
                <SlidersHorizontal size={18} className={showFilters ? "text-orange-500" : ""} />
              </button>
              <Mic className="text-[#ff7448] cursor-pointer hover:scale-105 transition-transform flex-shrink-0" size={18} />
            </div>

            {/* Expandable Filter Pills Toggle Row */}
            {showFilters && (
              <div className="flex gap-2 py-1 flex-wrap animate-fade-in">
                <button
                  onClick={() => setFilterOnline(!filterOnline)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                    filterOnline
                      ? "bg-green-500 text-white border-green-500 shadow-sm"
                      : "bg-white/95 text-gray-600 border-orange-200/40"
                  }`}
                >
                  <span className={filterOnline ? "text-white" : "text-green-500"}>●</span> Online
                </button>
                <button
                  onClick={() => setFilterFollowing(!filterFollowing)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                    filterFollowing
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                      : "bg-white/95 text-gray-600 border-orange-200/40"
                  }`}
                >
                  <span className={filterFollowing ? "text-white" : "text-red-500"}>♥</span> Following
                </button>
              </div>
            )}
          </div>

          {/* 3. Sticky Categories Container (Sticks below search bar container) */}
          <div className="sticky top-[76px] z-20 bg-white py-3 shadow-xs">
            <CategoryTabs activeTab={activeCategory} setActiveTab={setActiveCategory} />
          </div>

          {/* 4. Cards Section */}
          <div className="space-y-4 px-5 mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonChatCard key={i} />
                ))}
              </div>
            ) : astrologers.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-sm">
                {searchQuery || activeCategory !== "All" || filterOnline || filterFollowing
                  ? "No astrologers match your active filters."
                  : "No active online astrologers found."}
              </div>
            ) : (
              astrologers.map((item, index) => (
                <ChatAstrologerCard
                  key={index}
                  item={item}
                  isFollowed={followedAstro.includes(item.name)}
                  toggleFollow={toggleFollow}
                  handleStartChat={handleStartChat}
                  loadingAstro={loadingAstro}
                />
              ))
            )}
          </div>

          <InsufficientBalanceModal
            open={insufficient.open}
            onClose={() => setInsufficient({ open: false, message: "" })}
            message={insufficient.message}
          />

        </div>

        {/* Bottom Navigation */}
        <Bottomnav />

      </div>
    </div>
  );
}