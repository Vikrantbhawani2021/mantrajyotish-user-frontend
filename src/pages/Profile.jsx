import React, { useEffect, useState } from "react";
import {
  FiClock,
  FiBell,
  FiHelpCircle,
  FiLogOut,
  FiChevronRight,
  FiArrowLeft,
  FiCreditCard,
  FiCheckCircle,
  FiEdit2,
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
  const [profilePic, setProfilePic] = useState("");
  const [phone, setPhone] = useState("");
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const calculateCompletion = (u) => {
    if (!u) return 0;
    
    // We check key fields required/expected in user profile
    const fields = [
      u.name || (u.firstname && u.lastname) || u.firstname,
      u.gender,
      u.dateofbirth || u.dob,
      u.timeofbirth,
      u.placeofbirth || u.birthPlace,
      u.city,
      u.state,
      u.country,
      u.address,
    ];
    
    // Check if the user has a real custom email, not the auto-generated fallback one
    const isRealEmail = u.email && !u.email.endsWith("@kalpjoytish.com");
    fields.push(isRealEmail ? u.email : null);

    // Check if profile picture is custom and not the default fallback avatar
    const hasCustomProfileImage = u.profileImage && 
      !u.profileImage.includes("user_female_pic") && 
      !u.profileImage.includes("user_male_pic") && 
      !u.profileImage.includes("user_profile_pic") && 
      !u.profileImage.includes("astro_female_pic") && 
      !u.profileImage.includes("astro_male_pic") && 
      !u.profileImage.includes("astro_profile_pic") &&
      !u.profileImage.includes("randomuser.me");
    fields.push(hasCustomProfileImage ? u.profileImage : null);

    const completedCount = fields.filter(
      (field) => field !== undefined && field !== null && String(field).trim() !== ""
    ).length;

    return Math.round((completedCount / fields.length) * 100);
  };

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("user") || "{}");
      if (cached.uniqueId) setUniqueId(cached.uniqueId);
      if (cached.email) setEmail(cached.email);
      if (cached.profileImage) setProfilePic(cached.profileImage);
      if (cached.phone) setPhone(cached.phone);
      setCompletionPercentage(calculateCompletion(cached));
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
            const u = data.data.user || data.data;
            localStorage.setItem("user", JSON.stringify(u));
            if (u.uniqueId) setUniqueId(u.uniqueId);
            if (u.email) setEmail(u.email);
            if (u.profileImage) setProfilePic(u.profileImage);
            if (u.phone) setPhone(u.phone);
            setCompletionPercentage(calculateCompletion(u));
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
          <div className="relative bg-orange-400 rounded-b-[28px] px-5 pt-6 pb-6 text-center">

            {/* Top Bar Row */}
            <div className="flex items-center mb-5">
              <button
                onClick={() => navigate(-1)}
                className="bg-white/20 p-2 rounded-full text-white hover:bg-white/30 transition shrink-0 cursor-pointer"
              >
                <FiArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-bold text-white mx-auto pr-9">My Profile</h1>
            </div>

            {/* User Info Row */}
            <div className="flex items-center gap-4 text-left">
              <img
                src={profilePic || "https://randomuser.me/api/portraits/women/44.jpg"}
                alt="Profile"
                onError={(e) => { e.target.src = "https://randomuser.me/api/portraits/women/44.jpg"; }}
                className="w-16 h-16 rounded-full border-2 border-white object-cover shadow-sm bg-white shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">
                  {userName || "Astro User"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {uniqueId && (
                    <span className="text-white/95 text-[9px] font-extrabold bg-black/20 py-0.5 px-2 rounded-full tracking-wider border border-white/5 uppercase shrink-0">
                      ID: {uniqueId}
                    </span>
                  )}
                  {phone && (
                    <span className="text-white/95 text-xs font-semibold tracking-wide">
                      Phone: {phone.startsWith("+91") ? phone : `+91 ${phone}`}
                    </span>
                  )}
                  {email && !email.endsWith("@kalpjoytish.com") && (
                    <span className="text-white/95 text-xs font-semibold tracking-wide">
                      Email: {email}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Profile Completion Banner Card */}
          <div className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Profile Completion</span>
                <span className={`text-xs font-extrabold ${completionPercentage === 100 ? "text-green-500" : "text-orange-500"}`}>
                  {completionPercentage}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${completionPercentage}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${completionPercentage === 100 ? "bg-green-500" : "bg-orange-500"}`}
                ></div>
              </div>
            </div>
            {completionPercentage === 100 ? (
              <div className="ml-4 flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-600 text-xs px-3 py-2 rounded-xl font-extrabold">
                  <FiCheckCircle size={14} />
                  <span>Completed</span>
                </div>
                <button
                  onClick={() => navigate("/editprofile")}
                  className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-500 text-xs px-3 py-2 rounded-xl font-extrabold hover:bg-orange-100 transition active:scale-95 cursor-pointer"
                >
                  <FiEdit2 size={13} />
                  <span>Edit</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/editprofile")}
                className="ml-4 bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2.5 rounded-xl font-extrabold shadow-sm transition active:scale-95 shrink-0 cursor-pointer"
              >
                Complete
              </button>
            )}
          </div>

          {/* Menu */}
          <div className="px-4 py-5 space-y-4">

            <MenuItem
              icon={<FiClock />}
              title="Astro History (Chat & Calls)"
              onClick={() => navigate("/astro-history")}
            />

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