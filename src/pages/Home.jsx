import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Header from "../component/Header";
import SearchBar from "../component/SearchBar";
import Banner from "../component/Banner";
import ServiceGrid from "../component/ServiceGrid";
import Bottomnav from "../component/Bottomnav";
import PlanetCard from "../component/PlanetCard";

const planets = [
  {
    title: "☀️ Sun (Surya)",
    description: "Represents power, confidence, leadership and success.",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9QWWS2xZ7UGV_JhqrA4KfdjjSIz2DDGxU1WIZYlfONMe6-jpaHCMVRps&s=10",
    bgColor: "bg-orange-200",
  },
  {
    title: "🌙 Moon (Chandra)",
    description: "Represents emotions, peace, mind and creativity.",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMgWCsUCZ8HlEqIaUv8hsdeiIRrTt-ABz1Sm1wM9WVh38ug46UzlRDyjxS&s=10",
    bgColor: "bg-sky-200",
  },
  {
    title: "♂️ Mars (Mangal)",
    description: "Represents courage, energy and determination.",
    image:
      "https://cdn.mos.cms.futurecdn.net/H6kpiRtWBbKWGyS5H9JAR7-1024-80.jpg",
    bgColor: "bg-red-200",
  },
  {
    title: "☿ Mercury (Budh)",
    description: "Represents intelligence, communication and business.",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRY8PS7AxThvH2lpa-PzwQGYq6IicfOZddrjeKCD7ueoHER_uZn1bpF6p9d&s=10",
    bgColor: "bg-green-200",
  },
  {
    title: "♃ Jupiter (Guru)",
    description: "Represents wisdom, knowledge and prosperity.",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNjLRJkWVAoBuz-EV2ctFMyS86-QD7bNqRY0clGOBsCGlpThVD8FVBJkM&s=10",
    bgColor: "bg-yellow-200",
  },
  {
    title: "♀ Venus (Shukra)",
    description: "Represents love, luxury and relationships.",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9BMbbFguWarz5mGM6PAi32uuoK5EzLDOI-XiXeA4T57T79lN4hxHfHct5&s=10",
    bgColor: "bg-pink-200",
  },
  {
    title: "♄ Saturn (Shani)",
    description: "Represents karma, discipline and hard work.",
    image:
      "https://www.indiaparenting.com/images/328/planet-saturn.jpg",
    bgColor: "bg-gray-300",
  },
  {
    title: "☊ Rahu",
    description: "Represents ambition, illusion and transformation.",
    image:
      "https://i.pinimg.com/474x/77/71/f7/7771f76da1230034510985de048813ff.jpg",
    bgColor: "bg-purple-200",
  },
  {
    title: "☋ Ketu",
    description: "Represents spirituality, detachment and liberation.",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2yfw6gMw3nhISMWwfbOQVi9tCgZhAwJeze1WMnV1zKjHSHsuzDK4PzZI&s=10",
    bgColor: "bg-cyan-200",
  },
];

function Home() {
  const { isLoggedIn, updateUserName } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem("authToken");
      if (token) {
        fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/user/profile`, {
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

          <div className="px-5 mt-6">
            <ServiceGrid />
          </div>

          <div className="px-5 mt-6 space-y-5">
            {planets.map((planet, index) => (
              <PlanetCard
                key={index}
                title={planet.title}
                description={planet.description}
                image={planet.image}
                bgColor={planet.bgColor}
              />
            ))}
          </div>

        </div>

        {/* Bottom Navigation */}
        <Bottomnav />

      </div>
    </div>
  );
}

export default Home;