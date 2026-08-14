import React, { useState, useEffect } from "react";
import CallHeader from "../component/CallHeader";
import CallSearchBar from "../component/CallSearchBar";
import CategoryTabs from "../component/CategoryTabs";
import AstrologerCard from "../component/AstrologerCard";
import Bottomnav from "../component/Bottomnav";

const defaultAstrologers = [
  {
    id: 1,
    name: "Astro Sumit",
    skills: "Love, Career, Marriage",
    experience: "5 Years",
    rating: "4.9",
    price: "₹30/min",
    priceRaw: 30,
    image: "https://i.pravatar.cc/200?img=12",
    tag: "Top Rated"
  },
  {
    id: 2,
    name: "Astro Rakesh",
    skills: "Kundli, Vastu, Marriage",
    experience: "8 Years",
    rating: "4.8",
    price: "₹25/min",
    priceRaw: 25,
    image: "https://i.pravatar.cc/200?img=33",
    tag: "Trending"
  },
  {
    id: 3,
    name: "Astro Pooja",
    skills: "Numerology, Love, Career",
    experience: "6 Years",
    rating: "4.9",
    price: "₹35/min",
    priceRaw: 35,
    image: "https://i.pravatar.cc/200?img=47",
    tag: "Popular"
  },
  {
    id: 4,
    name: "Astro Amit",
    skills: "Vedic Astrology, Financial",
    experience: "10 Years",
    rating: "5.0",
    price: "₹40/min",
    priceRaw: 40,
    image: "https://i.pravatar.cc/200?img=68",
    tag: "Top Rated"
  },
  {
    id: 5,
    name: "Astro Sneha",
    skills: "Palmistry, Relationship",
    experience: "4 Years",
    rating: "4.7",
    price: "₹20/min",
    priceRaw: 20,
    image: "https://i.pravatar.cc/200?img=49",
    tag: "New"
  }
];

function Call() {
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOnlineAstrologers = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/astro/all?online=true`);
        const resData = await response.json();
        console.log("Fetch Online Astrologers API Response:", resData);
        
        const list = resData.data || resData.astrologers || resData.online || (Array.isArray(resData) ? resData : []);
        
        if (response.ok && list && list.length > 0) {
          const formatted = list.map(astro => ({
            id: astro._id || astro.id,
            name: astro.name || "Astrologer",
            skills: (astro.specialization && astro.specialization.join(", ")) || "Kundli, Vastu, Marriage",
            experience: astro.experience || "5 Years",
            rating: astro.rating || "4.8",
            price: astro.consultationFee ? `₹${astro.consultationFee}/min` : "₹15/min",
            priceRaw: astro.consultationFee || 15,
            image: astro.profileImage || `https://i.pravatar.cc/200?img=${Math.floor(Math.random() * 70) + 1}`,
            tag: astro.tag || (astro.rating >= 4.9 ? "Top Rated" : "")
          }));
          setAstrologers(formatted);
        } else {
          setAstrologers(defaultAstrologers);
        }
      } catch (error) {
        console.error("Fetch astrologers error in call page:", error);
        setAstrologers(defaultAstrologers);
      } finally {
        setLoading(false);
      }
    };

    fetchOnlineAstrologers();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex justify-center">

      {/* Mobile Container */}
      <div className="w-full max-w-[430px] bg-white min-h-screen shadow-xl relative overflow-hidden flex flex-col justify-between">

        {/* Scrollable Area */}
        <div className="overflow-y-auto h-screen pb-28">

          {/* Header */}
          <CallHeader />

          {/* Search */}
          <div className="mt-5">
            <CallSearchBar />
          </div>

          {/* Categories */}
          <div className="mt-5">
            <CategoryTabs />
          </div>

          {/* Astrologers list */}
          <div className="px-5 mt-6 space-y-4">
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