import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "../component/Header";
import SearchBar from "../component/SearchBar";
import Banner from "../component/Banner";
import ServiceGrid from "../component/ServiceGrid";
import Bottomnav from "../component/Bottomnav";
import PlanetCard from "../component/PlanetCard";
import { BACKEND_URL } from "../config/backend";

const DEFAULT_PLANETS = [
  {
    title: "☀️ Sun (Surya)",
    description: "Represents power, confidence, leadership and success.",
    details: "In Vedic astrology, the Sun represents the soul, king, father, ego, honor, authority, and power. A strong Sun in your chart gives charisma, high self-esteem, leadership qualities, and good health. Remedies for a weak Sun include offering water to the Sun at sunrise, chanting the Gayatri Mantra, and practicing Surya Namaskar.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9QWWS2xZ7UGV_JhqrA4KfdjjSIz2DDGxU1WIZYlfONMe6-jpaHCMVRps&s=10",
    bgColor: "bg-orange-200",
  },
  {
    title: "🌙 Moon (Chandra)",
    description: "Represents emotions, peace, mind and creativity.",
    details: "The Moon represents the mind, emotions, mother, peace, and intuition. It controls water elements in the body and governs mood swings and mental strength. A well-placed Moon brings tranquility, empathy, and artistic capabilities. To strengthen the Moon, keep fasting on Mondays, respect your mother, and wear silver.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMgWCsUCZ8HlEqIaUv8hsdeiIRrTt-ABz1Sm1wM9WVh38ug46UzlRDyjxS&s=10",
    bgColor: "bg-sky-200",
  },
  {
    title: "♂️ Mars (Mangal)",
    description: "Represents courage, energy and determination.",
    details: "Mars is the planet of action, passion, anger, physical strength, and determination. It rules over courage, brothers, and land. In Astrology, Manglik Dosha is caused by Mars' placement. To balance Mars energy, pray to Lord Hanuman, donate red lentils, and practice mindfulness to control anger.",
    image: "https://cdn.mos.cms.futurecdn.net/H6kpiRtWBbKWGyS5H9JAR7-1024-80.jpg",
    bgColor: "bg-red-200",
  },
  {
    title: "☿ Mercury (Budh)",
    description: "Represents intelligence, communication and business.",
    details: "Mercury represents intellect, communication, humor, analytical skills, and business trade. It controls the nervous system and skin. A strong Mercury is crucial for writers, speakers, and entrepreneurs. Remedies for Mercury include donating green clothes, feeding cows green grass, and chanting Budh Beej Mantra.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRY8PS7AxThvH2lpa-PzwQGYq6IicfOZddrjeKCD7ueoHER_uZn1bpF6p9d&s=10",
    bgColor: "bg-green-200",
  },
  {
    title: "♃ Jupiter (Guru)",
    description: "Represents wisdom, knowledge and prosperity.",
    details: "Jupiter is the most benevolent planet, representing wisdom, education, luck, wealth, children, and spirituality. It expands whatever it touches. A strong Jupiter guarantees success and wisdom in life. To strengthen Jupiter, worship Lord Vishnu, wear yellow clothes on Thursdays, and respect your teachers.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNjLRJkWVAoBuz-EV2ctFMyS86-QD7bNqRY0clGOBsCGlpThVD8FVBJkM&s=10",
    bgColor: "bg-yellow-200",
  },
  {
    title: "♀ Venus (Shukra)",
    description: "Represents love, luxury and relationships.",
    details: "Venus governs love, marriage, beauty, arts, vehicles, and luxury. It represents the life partner in a male chart and rules over creativity. A strong Venus brings comfort, romance, and artistic talents. To enhance Venus, wear white, donate sweets, and respect women.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9BMbbFguWarz5mGM6PAi32uuoK5EzLDOI-XiXeA4T57T79lN4hxHfHct5&s=10",
    bgColor: "bg-pink-200",
  },
  {
    title: "♄ Saturn (Shani)",
    description: "Represents karma, discipline and hard work.",
    details: "Saturn is the planet of justice, discipline, delay, and life lessons. It rewards hard work and punishes unethical deeds. A strong Saturn gives patience and endurance. Remedies for Saturn's challenging transits include donating mustard oil, helping the needy, and lighting a diya under a Peepal tree on Saturdays.",
    image: "https://www.indiaparenting.com/images/328/planet-saturn.jpg",
    bgColor: "bg-gray-300",
  },
  {
    title: "☊ Rahu",
    description: "Represents ambition, illusion and transformation.",
    details: "Rahu is a shadow planet representing sudden changes, desire, materialism, tech, and illusions. It breaks conventions and drives ambition. A well-placed Rahu brings sudden wealth and fame. To pacify Rahu, chant Rahu Mantras, feed birds, and avoid alcohol.",
    image: "https://i.pinimg.com/474x/77/71/f7/7771f76da1230034510985de048813ff.jpg",
    bgColor: "bg-purple-200",
  },
  {
    title: "☋ Ketu",
    description: "Represents spirituality, detachment and liberation.",
    details: "Ketu is the tail of the dragon, representing detachment, spirituality, occult knowledge, and liberation (Moksha). It brings deep inner wisdom but can cause isolation. To balance Ketu, practice meditation, feed stray dogs, and visit spiritual places.",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2yfw6gMw3nhISMWwfbOQVi9tCgZhAwJeze1WMnV1zKjHSHsuzDK4PzZI&s=10",
    bgColor: "bg-cyan-200",
  },
];


import { X } from "lucide-react";

const getModalHeaderGradient = (bgColor) => {
  switch (bgColor) {
    case "bg-orange-200": return "from-orange-500 to-orange-400";
    case "bg-sky-200": return "from-blue-500 to-sky-400";
    case "bg-red-200": return "from-red-500 to-rose-400";
    case "bg-green-200": return "from-green-500 to-emerald-400";
    case "bg-yellow-200": return "from-yellow-500 to-amber-400";
    case "bg-pink-200": return "from-pink-500 to-fuchsia-400";
    case "bg-gray-300": return "from-slate-600 to-gray-500";
    case "bg-purple-200": return "from-purple-500 to-violet-400";
    case "bg-cyan-200": return "from-teal-500 to-cyan-400";
    default: return "from-orange-500 to-orange-400";
  }
};

function Home() {
  const { isLoggedIn, updateUserName, user } = useAuth();

  // Admin access check (looks at user role, name, or explicit localStorage override)
  const isAdmin = 
    user?.role === "admin" || 
    user?.role === "ADMIN" || 
    user?.isAdmin || 
    user?.name?.toLowerCase().includes("admin") || 
    localStorage.getItem("isAdmin") === "true";

  // Planet data state loaded from localStorage, falling back to defaults
  const [planetList, setPlanetList] = useState(() => {
    try {
      const saved = localStorage.getItem("custom_planets");
      return saved ? JSON.parse(saved) : DEFAULT_PLANETS;
    } catch (e) {
      return DEFAULT_PLANETS;
    }
  });

  const [selectedPlanetIndex, setSelectedPlanetIndex] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form states for Admin Edit mode
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDetails, setEditDetails] = useState("");

  const handleOpenDetails = (index) => {
    setSelectedPlanetIndex(index);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    const planet = planetList[selectedPlanetIndex];
    setEditTitle(planet.title);
    setEditDescription(planet.description);
    setEditDetails(planet.details || "");
    setIsEditing(true);
  };

  const handleSavePlanet = () => {
    const updated = [...planetList];
    updated[selectedPlanetIndex] = {
      ...updated[selectedPlanetIndex],
      title: editTitle,
      description: editDescription,
      details: editDetails,
    };
    setPlanetList(updated);
    localStorage.setItem("custom_planets", JSON.stringify(updated));
    setIsEditing(false);
  };

  const handleResetToDefault = () => {
    const original = DEFAULT_PLANETS[selectedPlanetIndex];
    setEditTitle(original.title);
    setEditDescription(original.description);
    setEditDetails(original.details);
  };

  useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem("authToken");
      if (token) {
        fetch(`${BACKEND_URL}/api/user/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.data) {
              const u = data.data;
              localStorage.setItem("user", JSON.stringify(u));
              if (u.name) {
                updateUserName(u.name);
              } else if (u.firstname) {
                updateUserName(`${u.firstname} ${u.lastname || ""}`.trim());
              }
            }
          })
          .catch((err) => console.error("Error refreshing profile:", err));
      }
    }
  }, [isLoggedIn]);

  return (
    <div className="min-h-screen bg-[#F6E9E3] flex justify-center">
      <div className="w-full max-w-[430px] bg-[#FDE8E4] min-h-screen relative shadow-xl">

        {/* Scrollable Content */}
        <div className="pb-28 overflow-y-auto">

          <Header />

          <div className="px-5 mt-5">
            <SearchBar />
          </div>

          <div className="mt-5">
            <Banner />
          </div>

          <div className="px-4 mt-5">
            <ServiceGrid />
          </div>

          <div className="px-5 mt-6 space-y-5">
            {planetList.map((planet, index) => (
              <PlanetCard
                key={index}
                title={planet.title}
                description={planet.description}
                image={planet.image}
                bgColor={planet.bgColor}
                onView={() => handleOpenDetails(index)}
              />
            ))}
          </div>

        </div>

        {/* Bottom Navigation */}
        <Bottomnav />

        {/* Planet Details and Admin Edit Modal */}
        {selectedPlanetIndex !== null && (() => {
          const planet = planetList[selectedPlanetIndex];
          const headerGradient = getModalHeaderGradient(planet.bgColor);
          
          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2.5px] p-5">
              <div 
                className="absolute inset-0"
                onClick={() => {
                  if (!isEditing) setSelectedPlanetIndex(null);
                }}
              />
              
              <div className="w-full max-w-[380px] bg-white rounded-[32px] shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[85vh] relative z-10">
                {/* Header */}
                <div className={`relative bg-gradient-to-r ${headerGradient} px-5 pt-8 pb-10 text-center shrink-0`}>
                  <button
                    onClick={() => setSelectedPlanetIndex(null)}
                    disabled={isEditing}
                    className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition disabled:opacity-30 cursor-pointer"
                  >
                    <X size={18} />
                  </button>

                  <img
                    src={planet.image}
                    alt={planet.title}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg mx-auto"
                  />

                  {isEditing ? (
                    <span className="inline-block mt-3 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wide">
                      Edit Mode
                    </span>
                  ) : (
                    <h2 className="text-xl font-bold text-white mt-3 leading-snug">
                      {planet.title}
                    </h2>
                  )}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {!isEditing ? (
                    <div className="space-y-4">
                      {/* Short Description */}
                      <p className="text-sm font-semibold text-gray-500 italic text-center leading-relaxed">
                        "{planet.description}"
                      </p>

                      <div className="border-t border-gray-100 my-4" />

                      {/* Detailed Info */}
                      <div>
                        <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">
                          Astrological Significance
                        </h4>
                        <p className="text-sm text-[#1d2340]/90 leading-relaxed font-medium text-left whitespace-pre-line">
                          {planet.details || "No details provided yet."}
                        </p>
                      </div>

                      <div className="flex gap-3 pt-4 shrink-0">
                        {isAdmin && (
                          <button
                            onClick={handleStartEdit}
                            className="flex-1 h-11 bg-orange-50 hover:bg-orange-100 text-orange-600 font-extrabold text-sm rounded-2xl cursor-pointer transition active:scale-95"
                          >
                            Edit Info
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedPlanetIndex(null)}
                          className="flex-1 h-11 bg-gray-100 hover:bg-gray-200 text-gray-600 font-extrabold text-sm rounded-2xl cursor-pointer transition"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Edit Form */
                    <div className="space-y-4 text-left">
                      <div>
                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full mt-1 border border-gray-255 rounded-xl px-3 h-10 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none text-gray-800 font-medium"
                          placeholder="e.g. Sun (Surya)"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                          Short Summary
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full mt-1 border border-gray-255 rounded-xl px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none h-16 resize-none text-gray-700 font-medium"
                          placeholder="Brief description..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                          Detailed Astro Information
                        </label>
                        <textarea
                          value={editDetails}
                          onChange={(e) => setEditDetails(e.target.value)}
                          className="w-full mt-1 border border-gray-255 rounded-xl px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-400 outline-none h-36 resize-y text-gray-700 font-medium"
                          placeholder="Astro details, remedies, properties..."
                        />
                      </div>

                      <div className="flex gap-2.5 pt-3 shrink-0">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs px-4 rounded-xl cursor-pointer transition active:scale-[0.98]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleResetToDefault}
                          className="border border-gray-200 hover:bg-gray-50 text-gray-500 font-bold text-xs px-3 rounded-xl cursor-pointer transition active:scale-[0.98]"
                          title="Reset to default description"
                        >
                          Reset
                        </button>
                        <button
                          onClick={handleSavePlanet}
                          className="flex-1 bg-[#FF6F3D] hover:bg-[#e05e30] text-white py-2.5 rounded-xl font-extrabold text-xs shadow-md shadow-orange-500/20 cursor-pointer transition active:scale-[0.98]"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

export default Home;