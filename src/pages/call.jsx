import React, { useState, useEffect } from "react";
import { Search, Mic, SlidersHorizontal } from "lucide-react";
import CallHeader from "../component/CallHeader";
import CategoryTabs from "../component/CategoryTabs";
import AstrologerCard from "../component/AstrologerCard";
import Bottomnav from "../component/Bottomnav";
import { fetchAllAstrologers } from "../api/astro";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/backend";

function Call() {
  const [astrologers, setAstrologers] = useState([]);
  const [allAstrologers, setAllAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
        const resData = await fetchAllAstrologers();
        console.log("Fetch Astrologers API Response:", resData);
        const list = resData.data || (Array.isArray(resData) ? resData : []);
        if (resData && resData.success && list && list.length > 0) {
          const formatted = list.map(astro => ({
            id: astro._id || astro.id,
            name: astro.name || "Astrologer",
            isOnline: astro.isOnline ?? true,
            isAvailable: astro.isAvailable ?? true,
            skills: (astro.specialization && Array.isArray(astro.specialization)
              ? astro.specialization.join(", ")
              : astro.specialization) || "Kundli, Vastu, Marriage",
            experience: astro.experience ? `${astro.experience} Years` : "5 Years",
            rating: astro.rating ? String(astro.rating) : "4.8",
            price: astro.consultationFee ? `₹${astro.consultationFee}/min` : "₹15/min",
            priceRaw: astro.consultationFee || 15,
            image: astro.profileImage || `https://i.pravatar.cc/200?img=${Math.floor(Math.random() * 70) + 1}`,
            tag: astro.tag || (astro.rating >= 4.9 ? "Top Rated" : "")
          }));
          setAllAstrologers(formatted);
          setAstrologers(formatted);
        } else {
          setAllAstrologers([]);
          setAstrologers([]);
        }
      } catch (error) {
        console.error("Fetch astrologers error in call page:", error);
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
        console.log("🔌 Connected to live status sync socket for Call list");
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

  // Sync followed astrologers dynamically from localStorage on active filter change
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        setFollowedAstro(JSON.parse(localStorage.getItem("followedAstrologers")) || []);
      } catch {}
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
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
          (a.skills || "").toLowerCase().includes(q)
      );
    }

    // 2. Category Tab Filter
    if (activeCategory !== "All") {
      const cat = activeCategory.toLowerCase();
      filtered = filtered.filter((a) =>
        (a.skills || "").toLowerCase().includes(cat)
      );
    }

    // 3. Online Status Filter
    if (filterOnline) {
      filtered = filtered.filter((a) => a.isOnline === true && a.isAvailable === true);
    }

    // 4. Following Filter
    if (filterFollowing) {
      filtered = filtered.filter((a) => {
        // Read directly from fresh localStorage check for responsiveness
        let followed = [];
        try {
          followed = JSON.parse(localStorage.getItem("followedAstrologers")) || [];
        } catch {}
        return followed.includes(a.name);
      });
    }

    setAstrologers(filtered);
  }, [searchQuery, activeCategory, filterOnline, filterFollowing, allAstrologers, followedAstro]);

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex justify-center">

      {/* Mobile Container with fixed height to contain inner scrolling */}
      <div className="w-full max-w-[430px] bg-white h-screen h-[100dvh] shadow-xl relative overflow-hidden flex flex-col justify-between">

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto pb-28">

          {/* 1. Header Title Block (Scrolls away) */}
          <CallHeader />

          {/* 2. Sticky Search Bar & Filters Container (Sticks to top-0) */}
          <div className="sticky top-0 z-30 bg-gradient-to-r from-orange-500 to-orange-400 rounded-b-[24px] px-5 pb-5 pt-2 shadow-md flex flex-col gap-3">
            <div className="flex items-center bg-white border border-orange-100 rounded-full px-4 h-12 shadow-md focus-within:ring-2 focus-within:ring-orange-400 transition-all">
              <Search className="text-gray-400 flex-shrink-0" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search astrologers..."
                className="flex-1 bg-transparent outline-none px-3 text-sm text-gray-700 placeholder-gray-400"
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

          {/* 4. Astrologers list */}
          <div className="px-5 mt-4 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <span className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-sm text-gray-500 font-medium">Finding online astrologers...</span>
              </div>
            ) : astrologers.length === 0 ? (
              <div className="text-center py-20 text-gray-500 text-sm">
                {searchQuery || activeCategory !== "All" || filterOnline || filterFollowing
                  ? "No astrologers match your active filters."
                  : "No active online astrologers found."}
              </div>
            ) : (
              astrologers.map((astro) => (
                <AstrologerCard key={astro.id} item={astro} />
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

export default Call;