import React, { useEffect, useState } from "react";
import {
  FiClock,
  FiBell,
  FiHelpCircle,
  FiLogOut,
  FiChevronRight,
  FiArrowLeft,
  FiCreditCard,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Bottomnav from "../component/Bottomnav";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../config/backend";

function Profile() {
  const navigate = useNavigate();
  const { logoutUser, userName, updateUserName } = useAuth();
  const [uniqueId, setUniqueId] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("user") || "{}");
      if (cached.uniqueId) setUniqueId(cached.uniqueId);
      if (cached.email) setEmail(cached.email);
    } catch (e) {}

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
            if (u.uniqueId) setUniqueId(u.uniqueId);
            if (u.email) setEmail(u.email);
            const fullName = u.name || `${u.firstname || ""} ${u.lastname || ""}`.trim() || "Astro User";
            updateUserName(fullName);
          }
        })
        .catch((err) => console.error("Profile refresh error:", err));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#FAFAFA] relative shadow-xl">

        {/* Scrollable Content */}
        <div className="overflow-y-auto pb-28">

          {/* Header */}
          <div className="relative bg-orange-400 rounded-b-[35px] px-5 pt-8 pb-8 text-center">

            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="absolute top-5 left-5 bg-white/30 p-2 rounded-full text-white"
            >
              <FiArrowLeft size={22} />
            </button>

            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="Profile"
              className="w-24 h-24 rounded-full mx-auto border-4 border-white object-cover"
            />

            <h1 className="text-2xl font-bold text-white mt-4">
              {userName || "Astro User"}
            </h1>

            {uniqueId && (
              <p className="text-white/95 text-[11px] font-extrabold bg-black/15 py-1 px-3.5 rounded-full inline-block mt-1 tracking-wider border border-white/10 uppercase">
                ID: {uniqueId}
              </p>
            )}

            {email && (
              <p className="text-white/80 text-sm mt-1">
                {email.endsWith("@kalpjoytish.com") ? `Phone: +91 ${email.split("@")[0]}` : email}
              </p>
            )}

            {/* Progress Circle */}
            <div className="w-28 h-28 border-8 border-white/30 rounded-full flex items-center justify-center mx-auto mt-6">
              <span className="text-white text-3xl font-bold">
                0%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-white/30 rounded-full mt-6">
              <div className="w-0 h-full bg-white rounded-full"></div>
            </div>

           <button
  onClick={() => navigate("/editprofile")}
  className="mt-6 bg-white text-orange-500 px-8 py-3 rounded-full font-semibold shadow-md hover:bg-gray-100 transition"
>
  Complete Profile
</button>

          </div>

          {/* Menu */}
          <div className="px-4 py-5 space-y-4">

            <MenuItem
              icon={<FiClock />}
              title="Booking History"
              onClick={() => navigate("/booking-history")}
            />

            <MenuItem
              icon={<FiCreditCard />}
              title="My Wallet"
              onClick={() => navigate("/wallet")}
            />

            <MenuItem
              icon={<FiBell />}
              title="Notifications"
              onClick={() => navigate("/notifications")}
            />

            <MenuItem
              icon={<FiHelpCircle />}
              title="Help & Support"
              onClick={() => navigate("/help-support")}
            />

            <MenuItem
              icon={<FiLogOut />}
              title="Logout"
              danger
              onClick={logoutUser}
            />

          </div>

        </div>

        {/* Bottom Navigation */}
        <Bottomnav />

      </div>
    </div>
  );
}

function MenuItem({ icon, title, danger, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
    >
      <div
        className={`flex items-center gap-4 ${
          danger ? "text-red-500" : ""
        }`}
      >
        <div
          className={`text-xl ${
            danger ? "text-red-500" : "text-orange-500"
          }`}
        >
          {icon}
        </div>

        <span className="text-base font-medium">
          {title}
        </span>
      </div>

      <FiChevronRight className="text-gray-400" />
    </div>
  );
}

export default Profile;