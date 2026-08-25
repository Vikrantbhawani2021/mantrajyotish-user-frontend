import React, { useState, useEffect } from "react";
import {
  Search,
  Mic,
  SlidersHorizontal,
  X,
  Star,
  Phone,
  Video,
  MessageCircle,
  BriefcaseBusiness,
} from "lucide-react";

import CallHeader from "../component/CallHeader";
import CategoryTabs from "../component/CategoryTabs";
import AstrologerCard from "../component/AstrologerCard";
import AstrologerProfilePopup from "../component/AstrologerProfilePopup";
import Bottomnav from "../component/Bottomnav";

import { fetchAllAstrologers } from "../api/astro";
import { getBalance } from "../api/wallet";

import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/backend";


// ============================================================
// SKELETON CARD
// ============================================================

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 p-3 flex justify-between gap-3 w-full animate-pulse text-left">

      {/* Left */}
      <div className="flex gap-3 flex-1 min-w-0">

        {/* Avatar + Rating */}
        <div className="flex flex-col items-center flex-shrink-0 gap-2">

          <div className="w-16 h-16 rounded-[16px] bg-gray-200" />

          <div className="w-12 h-3 bg-gray-200 rounded-full mt-1.5" />

          <div className="w-8 h-2.5 bg-gray-100 rounded-full mt-1" />

        </div>


        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 justify-center">

          <div className="w-24 h-4 bg-gray-200 rounded-md" />

          <div className="w-12 h-3 bg-gray-100 rounded-md mt-0.5" />

          <div className="w-36 h-3 bg-gray-200 rounded-md mt-1" />

          <div className="w-20 h-3 bg-gray-100 rounded-md mt-0.5" />

          <div className="w-24 h-2.5 bg-gray-200 rounded-md mt-1" />

        </div>

      </div>


      {/* Right */}
      <div className="flex flex-col gap-1.5 justify-center items-center flex-shrink-0 ml-auto">

        <div className="w-10 h-3 bg-gray-200 rounded-md mb-1" />

        <div className="w-[82px] h-[36px] rounded-[12px] bg-gray-200" />

        <div className="w-[82px] h-[36px] rounded-[12px] bg-gray-100" />

      </div>

    </div>
  );
}


// ============================================================
// CALL PAGE
// ============================================================

function Call() {

  const [astrologers, setAstrologers] = useState([]);

  const [allAstrologers, setAllAstrologers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");


  // ----------------------------------------------------------
  // FILTER STATES
  // ----------------------------------------------------------

  const [activeCategory, setActiveCategory] = useState("All");

  const [showFilters, setShowFilters] = useState(false);

  const [filterOnline, setFilterOnline] = useState(false);

  const [filterFollowing, setFilterFollowing] = useState(false);


  // ----------------------------------------------------------
  // SELECTED ASTROLOGER
  // ----------------------------------------------------------

  const [selectedAstrologer, setSelectedAstrologer] =
    useState(null);


  // ----------------------------------------------------------
  // FOLLOWED ASTROLOGERS
  // ----------------------------------------------------------

  const [followedAstro, setFollowedAstro] = useState(() => {

    try {

      return (
        JSON.parse(
          localStorage.getItem("followedAstrologers")
        ) || []
      );

    } catch {

      return [];

    }

  });


  // ==========================================================
  // FETCH ASTROLOGERS
  // ==========================================================

  useEffect(() => {

    const fetchOnlineAstrologers = async () => {

      try {

        const resData =
          await fetchAllAstrologers();

        console.log(
          "Fetch Astrologers API Response:",
          resData
        );


        const list =
          resData.data ||
          (Array.isArray(resData)
            ? resData
            : []);


        if (
          resData &&
          resData.success &&
          list &&
          list.length > 0
        ) {

          const formatted =
            list.map((astro) => ({

              id:
                astro._id ||
                astro.id,

              name:
                astro.name ||
                "Astrologer",

              isOnline:
                astro.isOnline ??
                true,

              isAvailable:
                astro.isAvailable ??
                true,

              skills:
                (
                  astro.specialization &&
                    Array.isArray(
                      astro.specialization
                    )
                    ? astro.specialization.join(
                      ", "
                    )
                    : astro.specialization
                ) ||
                "Kundli, Vastu, Marriage",

              experience:
                astro.experience
                  ? `${astro.experience} Years`
                  : "5 Years",

              rating:
                astro.rating
                  ? String(
                    astro.rating
                  )
                  : "4.8",

              price:
                astro.price
                  ? `₹${astro.price}/min`
                  : "₹9/min",

              priceRaw:
                astro.price ||
                9,

              image:
                astro.profileImage ||
                `https://i.pravatar.cc/200?img=${((astro._id || astro.id || "1").toString().split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 70) + 1}`,

              tag:
                astro.tag ||
                (
                  astro.rating >= 4.9
                    ? "Top Rated"
                    : ""
                ),

              // Keep original API data as well
              // for future profile details.
              ...astro,

            }));


          setAllAstrologers(formatted);

          setAstrologers(formatted);

        } else {

          setAllAstrologers([]);

          setAstrologers([]);

        }

      } catch (error) {

        console.error(
          "Fetch astrologers error in call page:",
          error
        );

        setAllAstrologers([]);

        setAstrologers([]);

      } finally {

        setLoading(false);

      }

    };


    fetchOnlineAstrologers();


    // Re-fetch every 20 seconds
    const interval =
      setInterval(
        fetchOnlineAstrologers,
        20000
      );


    return () =>
      clearInterval(interval);

  }, []);


  // ==========================================================
  // WALLET BALANCE
  // ==========================================================

  useEffect(() => {

    const fetchBalanceOnMount =
      async () => {

        try {

          const userObj =
            JSON.parse(
              localStorage.getItem(
                "user"
              ) || "{}"
            );


          const uid =
            userObj._id ||
            userObj.id ||
            userObj.userId ||
            "";


          if (!uid) return;


          const query =
            `userId=${uid}`;


          const res =
            await getBalance(
              query
            );


          const bal =
            res?.data
              ?.walletBalance ??
            res?.data
              ?.balance ??
            0;


          localStorage.setItem(
            "wallet_balance",
            Number(bal).toFixed(2)
          );

        } catch (err) {

          console.warn(
            "Failed to background fetch wallet balance:",
            err
          );

        }

      };


    fetchBalanceOnMount();

  }, []);


  // ==========================================================
  // REAL-TIME ASTROLOGER STATUS
  // ==========================================================

  useEffect(() => {

    let socket;


    try {

      socket = io(
        BACKEND_URL,
        {
          transports: [
            "polling",
            "websocket",
          ],
        }
      );


      socket.on(
        "connect",
        () => {

          console.log(
            "🔌 Connected to live status sync socket for Call list"
          );

        }
      );


      socket.on(
        "astrologer_status_changed",
        (updatedData) => {

          console.log(
            "⚡ Real-time status update received:",
            updatedData
          );


          const updateStatus =
            (list) =>

              list.map(
                (astro) =>

                  astro.id ===
                    updatedData.astrologerId

                    ? {
                      ...astro,

                      isOnline:
                        updatedData.isOnline,

                      isAvailable:
                        updatedData.isAvailable,

                    }

                    : astro
              );


          setAllAstrologers(
            (prev) =>
              updateStatus(prev)
          );


          setAstrologers(
            (prev) =>
              updateStatus(prev)
          );


          // Also update popup if it is open.
          setSelectedAstrologer(
            (prev) => {

              if (
                !prev ||
                prev.id !==
                updatedData.astrologerId
              ) {
                return prev;
              }


              return {
                ...prev,

                isOnline:
                  updatedData.isOnline,

                isAvailable:
                  updatedData.isAvailable,

              };

            }
          );

        }
      );


    } catch (err) {

      console.error(
        "Failed to connect live status socket:",
        err
      );

    }


    return () => {

      if (socket) {
        socket.disconnect();
      }

    };

  }, []);


  // ==========================================================
  // SYNC FOLLOWED ASTROLOGERS
  // ==========================================================

  useEffect(() => {

    const handleStorageChange =
      () => {

        try {

          setFollowedAstro(
            JSON.parse(
              localStorage.getItem(
                "followedAstrologers"
              )
            ) || []
          );

        } catch { }

      };


    window.addEventListener(
      "storage",
      handleStorageChange
    );


    return () =>
      window.removeEventListener(
        "storage",
        handleStorageChange
      );

  }, []);


  // ==========================================================
  // FILTERING
  // ==========================================================

  useEffect(() => {

    let filtered =
      [...allAstrologers];


    // Search
    if (
      searchQuery.trim()
    ) {

      const q =
        searchQuery.toLowerCase();


      filtered =
        filtered.filter(
          (a) =>

            a.name
              .toLowerCase()
              .includes(q) ||

            (
              a.skills || ""
            )
              .toLowerCase()
              .includes(q)
        );

    }


    // Category
    if (
      activeCategory !==
      "All"
    ) {

      const cat =
        activeCategory.toLowerCase();


      filtered =
        filtered.filter(
          (a) =>

            (
              a.skills || ""
            )
              .toLowerCase()
              .includes(cat)
        );

    }


    // Online
    if (filterOnline) {

      filtered =
        filtered.filter(
          (a) =>
            a.isOnline === true &&
            a.isAvailable === true
        );

    }


    // Following
    if (filterFollowing) {

      filtered =
        filtered.filter(
          (a) => {

            let followed =
              [];

            try {

              followed =
                JSON.parse(
                  localStorage.getItem(
                    "followedAstrologers"
                  )
                ) || [];

            } catch { }


            return followed.includes(
              a.name
            );

          }
        );

    }


    setAstrologers(
      filtered
    );

  }, [
    searchQuery,
    activeCategory,
    filterOnline,
    filterFollowing,
    allAstrologers,
    followedAstro,
  ]);


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="min-h-screen bg-[#F7F7F7] flex justify-center">

      <div className="w-full max-w-[430px] bg-white h-screen h-[100dvh] shadow-xl relative overflow-hidden flex flex-col justify-between">


        {/* ====================================================
            SCROLLABLE CONTENT
        ==================================================== */}

        <div className="flex-1 overflow-y-auto pb-28">


          {/* HEADER */}

          <CallHeader />


          {/* ==================================================
              SEARCH + FILTERS
          ================================================== */}

          <div className="sticky top-0 z-30 bg-gradient-to-r from-orange-500 to-orange-400 rounded-b-[24px] px-5 pb-5 pt-2 shadow-md flex flex-col gap-3">

            <div className="flex items-center bg-white border border-orange-100 rounded-full px-4 h-12 shadow-md focus-within:ring-2 focus-within:ring-orange-400 transition-all">

              <Search
                className="text-gray-400 flex-shrink-0"
                size={18}
              />


              <input
                type="text"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                placeholder="Search astrologers..."
                className="flex-1 min-w-0 bg-transparent outline-none px-3 text-sm text-gray-700 placeholder-gray-400"
              />


              <button
                onClick={() =>
                  setShowFilters(
                    !showFilters
                  )
                }
                className="text-gray-400 hover:text-orange-500 transition-colors p-1 cursor-pointer flex-shrink-0"
                title="Toggle Filters"
              >

                <SlidersHorizontal
                  size={18}
                  className={
                    showFilters
                      ? "text-orange-500"
                      : ""
                  }
                />

              </button>


              <Mic
                className="text-[#ff7448] cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                size={18}
              />

            </div>


            {/* FILTER PILLS */}

            {showFilters && (

              <div className="flex gap-2 py-1 flex-wrap animate-fade-in">

                <button
                  onClick={() =>
                    setFilterOnline(
                      !filterOnline
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-[9px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${filterOnline
                    ? "bg-green-500 text-white border-green-500 shadow-sm"
                    : "bg-white/95 text-gray-600 border-orange-200/40"
                    }`}
                >

                  <span
                    className={
                      filterOnline
                        ? "text-white"
                        : "text-green-500"
                    }
                  >
                    ●
                  </span>

                  Online

                </button>


                <button
                  onClick={() =>
                    setFilterFollowing(
                      !filterFollowing
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-[9px] font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${filterFollowing
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                    : "bg-white/95 text-gray-600 border-orange-200/40"
                    }`}
                >

                  <span
                    className={
                      filterFollowing
                        ? "text-white"
                        : "text-red-500"
                    }
                  >
                    ♥
                  </span>

                  Following

                </button>

              </div>

            )}

          </div>


          {/* ==================================================
              CATEGORY TABS
          ================================================== */}

          <div className="sticky top-[76px] z-20 bg-white py-3 shadow-xs">

            <CategoryTabs
              activeTab={
                activeCategory
              }
              setActiveTab={
                setActiveCategory
              }
            />

          </div>


          {/* ==================================================
              ASTROLOGERS
          ================================================== */}

          <div className="px-5 mt-4 space-y-4">

            {loading ? (

              <div className="space-y-4">

                {[1, 2, 3, 4].map(
                  (i) => (
                    <SkeletonCard
                      key={i}
                    />
                  )
                )}

              </div>

            ) : astrologers.length ===
              0 ? (

              <div className="text-center py-20 text-gray-500 text-sm">

                {searchQuery ||
                  activeCategory !==
                  "All" ||
                  filterOnline ||
                  filterFollowing

                  ? "No astrologers match your active filters."

                  : "No active online astrologers found."}

              </div>

            ) : (

              astrologers.map(
                (astro) => (

                  <AstrologerCard
                    key={astro.id}
                    item={astro}
                    onProfileClick={() =>
                      setSelectedAstrologer(
                        astro
                      )
                    }
                  />

                )
              )

            )}

          </div>

        </div>


        {/* ====================================================
            BOTTOM NAVIGATION
        ==================================================== */}

        <Bottomnav />


        {/* ====================================================
            PROFILE POPUP
        ==================================================== */}

        {selectedAstrologer && (

          <AstrologerProfilePopup
            astrologer={
              selectedAstrologer
            }
            onClose={() =>
              setSelectedAstrologer(
                null
              )
            }
          />

        )}

      </div>


      {/* ANIMATION */}

      <style>{`

        @keyframes fadeIn {

          from {
            opacity: 0;
            transform: translateY(-4px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }

        }


        .animate-fade-in {

          animation:
            fadeIn
            0.2s
            ease-out
            forwards;

        }


        @keyframes slideUp {

          from {
            opacity: 0;
            transform: translateY(100%);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }

        }


        .animate-slide-up {

          animation:
            slideUp
            0.25s
            ease-out;

        }

      `}</style>

    </div>

  );

}





export default Call;