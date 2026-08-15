import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronDown,
  ArrowRight,
  User,
  Calendar,
  Clock,
  MapPin,
  Map,
  Camera,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import Bottomnav from "../component/Bottomnav";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const SunEmblem = () => (
  <svg
    viewBox="0 0 100 100"
    className="w-12 h-12 text-white animate-spin-slow"
    fill="currentColor"
  >
    <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="6" />
    <circle cx="50" cy="50" r="15" fill="currentColor" />
    <path d="M 50 5 L 55 20 L 45 20 Z" />
    <path d="M 50 95 L 55 80 L 45 80 Z" />
    <path d="M 5 50 L 20 55 L 20 45 Z" />
    <path d="M 95 50 L 80 55 L 80 45 Z" />
    <path d="M 18 18 L 31 29 L 28 32 Z" />
    <path d="M 82 82 L 69 71 L 72 68 Z" />
    <path d="M 18 82 L 31 71 L 28 68 Z" />
    <path d="M 82 18 L 69 29 L 72 32 Z" />
  </svg>
);

const StepIndicator = ({ activeStep }) => {
  const totalSteps = 8;
  return (
    <div className="flex items-center justify-between w-full px-2 mt-4 relative">
      {/* Connecting Line */}
      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-[2px] bg-orange-100 z-0"></div>
      
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === activeStep;
        const isCompleted = stepNum < activeStep;
        
        return (
          <div
            key={stepNum}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold z-10 transition-all duration-300 ${
              isActive
                ? "bg-[#ff7448] text-white scale-110 shadow-md shadow-orange-500/25"
                : isCompleted
                ? "bg-orange-50 border border-[#ff7448] text-[#ff7448]"
                : "bg-white border border-gray-200 text-gray-400"
            }`}
          >
            {stepNum}
          </div>
        );
      })}
    </div>
  );
};

export default function EditProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateUserName, userName, saveUser } = useAuth();

  // Check if we are in onboarding mode
  const isOnboarding = location.search.includes("mode=onboarding");

  // Single consolidated Form State
  const [formData, setFormData] = useState({
    name: (userName && userName !== "Ravi Sharma") ? userName : "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    tob: "",
    birthPlace: "",
    city: "",
    state: "",
    country: "",
    address: "",
  });

  const [isUpdating, setIsUpdating] = useState(false);

  // Custom Popup Modal State
  const [popup, setPopup] = useState({
    show: false,
    title: "",
    message: "",
    type: "success",
    onConfirm: null
  });

  const showPopup = (title, message, type = "success", onConfirm = null) => {
    setPopup({
      show: true,
      title,
      message,
      type,
      onConfirm
    });
  };

  const closePopup = () => {
    const callback = popup.onConfirm;
    setPopup({ show: false, title: "", message: "", type: "success", onConfirm: null });
    if (callback) callback();
  };

  // Fetch current user details on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/user/profile`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok && data.success) {
          const u = data.data.user || data.data;
          
          let displayDob = "";
          if (u.dateofbirth) {
            const dateObj = new Date(u.dateofbirth);
            if (!isNaN(dateObj.getTime())) {
              const d = String(dateObj.getDate()).padStart(2, "0");
              const m = String(dateObj.getMonth() + 1).padStart(2, "0");
              const y = dateObj.getFullYear();
              displayDob = `${d} / ${m} / ${y}`;
            }
          }
          
          setFormData({
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            gender: u.gender ? (u.gender.charAt(0).toUpperCase() + u.gender.slice(1)) : "Select Gender",
            dob: displayDob,
            tob: u.timeofbirth || "",
            birthPlace: u.placeofbirth || "",
            city: u.city || "",
            state: u.state || "",
            country: u.country || "",
            address: u.address || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err);
        // Fallback to local storage
        const savedUserStr = localStorage.getItem("user");
        if (savedUserStr) {
          try {
            const u = JSON.parse(savedUserStr);
            setFormData({
              name: u.name || "",
              email: u.email || "",
              phone: u.phone || "",
              gender: u.gender ? (u.gender.charAt(0).toUpperCase() + u.gender.slice(1)) : "Select Gender",
              dob: u.dob || "",
              tob: u.timeofbirth || "",
              birthPlace: u.placeofbirth || "",
              city: u.city || "",
              state: u.state || "",
              country: u.country || "",
              address: u.address || "",
            });
          } catch (e) {
            console.error("Parsing local user failed", e);
          }
        }
      }
    };
    
    fetchProfile();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    navigate(-1);
  };

  const validateProfileForm = (data, isEmailRequired = false) => {
    const nameTrimmed = (data.name || "").trim();
    if (!nameTrimmed) {
      return "Please enter full name";
    }
    if (!/^[a-zA-Z\s]{3,}$/.test(nameTrimmed)) {
      return "Name must contain only letters and be at least 3 characters long";
    }

    if (isEmailRequired || data.email) {
      const emailTrimmed = (data.email || "").trim();
      if (!emailTrimmed) {
        return "Please enter email";
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        return "Please enter a valid email address";
      }
    }

    if (!data.gender || data.gender === "Select Gender") {
      return "Please select gender";
    }

    // DOB Validation
    if (!data.dob) {
      return "Please enter date of birth";
    }
    const dobParts = data.dob.split(" / ");
    if (dobParts.length === 3) {
      const day = parseInt(dobParts[0], 10);
      const month = parseInt(dobParts[1], 10) - 1;
      const year = parseInt(dobParts[2], 10);
      const dateObj = new Date(year, month, day);
      const today = new Date();
      
      if (
        isNaN(dateObj.getTime()) ||
        dateObj.getFullYear() !== year ||
        dateObj.getMonth() !== month ||
        dateObj.getDate() !== day
      ) {
        return "Please enter a valid Date of Birth";
      }
      if (dateObj > today) {
        return "Date of Birth cannot be in the future";
      }
      if (year < 1900) {
        return "Please enter a realistic birth year (1900 or later)";
      }
    } else {
      return "Please enter Date of Birth in DD / MM / YYYY format";
    }

    if (!data.tob) {
      return "Please enter time of birth";
    }

    // Location Text Fields
    const textFields = {
      "city": data.city,
      "state": data.state,
      "country": data.country
    };
    if (isOnboarding) {
      textFields["place of birth"] = data.birthPlace;
    }

    for (const [fieldName, val] of Object.entries(textFields)) {
      const trimmed = (val || "").trim();
      if (!trimmed) {
        return `Please enter your ${fieldName}`;
      }
      if (!/^[a-zA-Z0-9\s,.\-()'/]+$/.test(trimmed)) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must contain only letters, numbers, or common punctuation`;
      }
    }

    return null; // Valid
  };

  const handleContinue = async () => {
    const validationError = validateProfileForm(formData, false);
    if (validationError) {
      showPopup("Incomplete Details", validationError, "error");
      return;
    }
    
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("authToken");
      const phoneVal = localStorage.getItem("phone") || formData.phone;

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: (() => {
          let formattedDob = "";
          if (formData.dob) {
            const parts = formData.dob.split(" / ");
            if (parts.length === 3) {
              formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
              formattedDob = formData.dob;
            }
          }
          const cleanPhone = phoneVal ? phoneVal.replace(/\D/g, "") : Math.random().toString(36).substring(7);
          const userEmail = formData.email || `${cleanPhone}@kalpjoytish.com`;

          return JSON.stringify({
            name: formData.name,
            gender: formData.gender,
            dateofbirth: formattedDob,
            timeofbirth: formData.tob,
            placeofbirth: formData.birthPlace,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            address: formData.address,
            email: userEmail
          });
        })()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        updateUserName(formData.name);
        localStorage.setItem("dob", formData.dob || "");
        
        if (data.data) {
          const updatedUser = data.data.user || data.data;
          saveUser(updatedUser);
        }
        
        showPopup(
          "Profile Completed!",
          "Your profile has been saved successfully.",
          "success",
          () => navigate(location.state?.from || "/home")
        );
      } else {
        showPopup("Error", data.message || `Failed to save profile: ${response.statusText}`, "error");
      }
    } catch (err) {
      console.error("Profile Save Error:", err);
      showPopup("Error", `Profile completion failed: ${err.message}`, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSingleSave = async () => {
    const validationError = validateProfileForm(formData, true);
    if (validationError) {
      showPopup("Incomplete Details", validationError, "error");
      return;
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("authToken");
      
      let formattedDob = "";
      if (formData.dob) {
        const parts = formData.dob.split(" / ");
        if (parts.length === 3) {
          formattedDob = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          formattedDob = formData.dob;
        }
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          gender: formData.gender,
          dateofbirth: formattedDob,
          timeofbirth: formData.tob,
          placeofbirth: formData.birthPlace,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          address: formData.address,
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        updateUserName(formData.name);
        if (data.data) {
          const updatedUser = data.data.user || data.data;
          saveUser(updatedUser);
        }
        showPopup(
          "Profile Saved!",
          "Your profile details have been saved successfully.",
          "success",
          () => navigate("/profile")
        );
      } else {
        showPopup("Error", data.message || `Failed to save profile: ${response.statusText}`, "error");
      }
    } catch (err) {
      console.error("Profile Save Error:", err);
      showPopup("Error", `Profile update failed: ${err.message}`, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Parse "HH:MM AM/PM"
  const parseTob = (tobStr) => {
    if (!tobStr) return { hour: "", minute: "", ampm: "AM" };
    const parts = tobStr.split(" ");
    const timePart = parts[0] || "";
    const ampmPart = parts[1] || "AM";
    const [h, m] = timePart.split(":");
    return {
      hour: h || "",
      minute: m || "",
      ampm: ampmPart || "AM",
    };
  };

  const updateTob = (newHour, newMinute, newAmpm) => {
    let h = newHour.replace(/\D/g, "");
    if (h.length === 2) {
      const hrs = parseInt(h, 10);
      if (hrs > 12) h = "12";
      if (hrs === 0) h = "12";
    }
    
    let m = newMinute.replace(/\D/g, "");
    if (m.length === 2) {
      const mins = parseInt(m, 10);
      if (mins > 59) m = "59";
    }

    if (h || m) {
      handleChange("tob", `${h}:${m} ${newAmpm}`);
    } else {
      handleChange("tob", "");
    }
  };

  const handleHourBlur = () => {
    const { hour, minute, ampm } = parseTob(formData.tob);
    if (!hour) return;
    let h = hour.replace(/\D/g, "");
    const hrs = parseInt(h, 10);
    if (hrs > 12) h = "12";
    if (hrs === 0) h = "12";
    const paddedH = String(hrs).padStart(2, "0");
    handleChange("tob", `${paddedH}:${minute} ${ampm}`);
  };

  const handleMinuteBlur = () => {
    const { hour, minute, ampm } = parseTob(formData.tob);
    if (!minute) return;
    let m = minute.replace(/\D/g, "");
    const mins = parseInt(m, 10);
    if (mins > 59) m = "59";
    const paddedM = String(mins).padStart(2, "0");
    handleChange("tob", `${hour}:${paddedM} ${ampm}`);
  };

  if (isOnboarding) {
    // -------------------------------------------------------------
    // ONBOARDING VIEW (Single-Page Form Layout)
    // -------------------------------------------------------------
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen bg-white relative shadow-xl flex flex-col justify-between overflow-x-hidden">
          
          {/* Top Header Background Gradient */}
          <div className="bg-gradient-to-b from-[#ffcfb4] via-[#ffe2d6] to-white pt-8 pb-14 px-5 relative flex flex-col">
            {/* Back Button */}
            <div className="flex items-center w-full z-10">
              <button
                onClick={handleBack}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform text-gray-700 cursor-pointer"
              >
                <ChevronLeft size={24} />
              </button>
            </div>
          </div>

          {/* Form Card (Overlap) */}
          <div className="bg-white rounded-t-[40px] px-6 pb-12 -mt-8 flex-1 relative flex flex-col">
            {/* Protruding Emblem */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-full border-[6px] border-white shadow-lg flex items-center justify-center z-10">
              <img
                src={logo}
                alt="Logo"
                className="w-18 h-18 object-contain"
              />
            </div>

            {/* Heading */}
            <div className="text-center mt-16 mb-8">
              <h1 className="text-2xl font-bold text-[#421d18] tracking-tight">
                Complete Your Profile
              </h1>
              <p className="text-gray-500 text-[13px] mt-2 px-6 leading-relaxed">
                We just need a few details to personalize your experience
              </p>
            </div>

            {/* Single Page Form Fields */}
            <div className="space-y-5 flex-1">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Full Name *</label>
                <div className="relative flex items-center">
                  <User size={20} className="text-[#ff7448] absolute left-4" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-12 pr-4 py-3.5 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-base shadow-sm"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Gender *</label>
                <div className="relative flex items-center">
                  <User size={20} className="text-[#ff7448] absolute left-4 pointer-events-none z-10" />
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-base shadow-sm appearance-none bg-white cursor-pointer"
                  >
                    <option>Select Gender</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  <ChevronDown className="absolute right-4 text-gray-500 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Date of Birth *</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={formData.dob}
                    onChange={(e) => {
                      const value = e.target.value;
                      const clean = value.replace(/\D/g, "");
                      let formatted = "";
                      if (clean.length > 0) {
                        formatted += clean.substring(0, 2);
                      }
                      if (clean.length > 2) {
                        formatted += " / " + clean.substring(2, 4);
                      }
                      if (clean.length > 4) {
                        let yearVal = clean.substring(4, 8);
                        if (yearVal.length === 4) {
                          const currentYear = new Date().getFullYear();
                          if (parseInt(yearVal, 10) > currentYear) {
                            yearVal = currentYear.toString();
                          }
                        }
                        formatted += " / " + yearVal;
                      }
                      handleChange("dob", formatted);
                    }}
                    placeholder="DD / MM / YYYY"
                    maxLength={14}
                    className="w-full px-5 py-3.5 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-base shadow-sm pr-12"
                  />
                  <div className="absolute right-4 w-6 h-6 flex items-center justify-center cursor-pointer">
                    <Calendar size={20} className="text-[#ff7448]" />
                    <input
                      type="date"
                      max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const [year, month, day] = val.split("-");
                        handleChange("dob", `${day} / ${month} / ${year}`);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Time of Birth */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Time of Birth *</label>
                <div className="relative flex items-center">
                  <Clock size={20} className="text-[#ff7448] absolute left-4 pointer-events-none" />
                  <input
                    type="time"
                    value={formData.tob}
                    onChange={(e) => handleChange("tob", e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-base shadow-sm"
                  />
                </div>
              </div>

              {/* Birth Place */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Birth Place *</label>
                <div className="relative flex items-center">
                  <MapPin size={20} className="text-[#ff7448] absolute left-4" />
                  <input
                    type="text"
                    value={formData.birthPlace}
                    onChange={(e) => handleChange("birthPlace", e.target.value)}
                    placeholder="Enter birth place"
                    className="w-full pl-12 pr-4 py-3.5 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-base shadow-sm"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">City *</label>
                <div className="relative flex items-center">
                  <Map size={20} className="text-[#ff7448] absolute left-4" />
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    placeholder="Enter city"
                    className="w-full pl-12 pr-4 py-3.5 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-base shadow-sm"
                  />
                </div>
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">State *</label>
                <div className="relative flex items-center">
                  <Map size={20} className="text-[#ff7448] absolute left-4" />
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    placeholder="Enter state"
                    className="w-full pl-12 pr-4 py-3.5 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-base shadow-sm"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Country *</label>
                <div className="relative flex items-center">
                  <MapPin size={20} className="text-[#ff7448] absolute left-4" />
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    placeholder="Enter country"
                    className="w-full pl-12 pr-4 py-3.5 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-base shadow-sm"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">Address (Optional)</label>
                <div className="relative flex items-start">
                  <MapPin size={20} className="text-[#ff7448] absolute left-4 top-3.5" />
                  <textarea
                    rows="3"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Enter your current address"
                    className="w-full pl-12 pr-4 py-3.5 border border-orange-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-base shadow-sm resize-none"
                  ></textarea>
                </div>
              </div>

            </div>

            {/* Complete Profile button */}
            <button
              onClick={handleContinue}
              disabled={isUpdating}
              className={`w-full mt-8 bg-gradient-to-r from-orange-400 to-[#ff7448] text-white py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.99] transition-all cursor-pointer ${isUpdating ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {isUpdating ? "Completing Profile..." : "Complete Profile"}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* Cool Custom Popup Modal */}
        {popup.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative border border-orange-100 flex flex-col items-center text-center transform transition-all duration-300 scale-100">
              <button
                onClick={closePopup}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon Header */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                popup.type === "success" 
                  ? "bg-gradient-to-tr from-emerald-100 to-green-50 text-emerald-600 shadow-md shadow-emerald-100" 
                  : "bg-gradient-to-tr from-rose-100 to-red-50 text-rose-600 shadow-md shadow-rose-100"
              }`}>
                {popup.type === "success" ? (
                  <CheckCircle2 className="w-9 h-9" />
                ) : (
                  <AlertCircle className="w-9 h-9" />
                )}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {popup.title}
              </h3>

              {/* Message */}
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {popup.message}
              </p>

              {/* Action Button */}
              <button
                onClick={closePopup}
                className={`w-full py-3.5 px-6 rounded-2xl font-semibold text-white shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  popup.type === "success"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-200"
                    : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-red-200"
                }`}
              >
                {popup.type === "success" ? "Continue" : "Got It"}
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fadeIn 0.25s ease-out forwards;
          }
          .animate-spin-slow {
            animation: spin 8s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STANDARD EDIT PROFILE VIEW (Single-Page Form Layout)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#FAFAFA] relative shadow-xl">

        {/* Scroll Area */}
        <div className="overflow-y-auto pb-28">

          {/* Header */}
          <div className="relative bg-orange-400 rounded-b-[35px] px-5 pt-8 pb-20">
            <button
              onClick={() => navigate(-1)}
              className="absolute top-5 left-5 bg-white/30 p-2 rounded-full text-white cursor-pointer"
            >
              <FiArrowLeft size={22} />
            </button>

            <h1 className="text-center text-2xl font-bold text-white">
              Edit Profile
            </h1>
          </div>

          {/* Profile Image */}
          <div className="-mt-14 flex justify-center">
            <div className="relative">
              <img
                src="https://randomuser.me/api/portraits/women/44.jpg"
                alt="profile"
                className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <button className="absolute bottom-0 right-0 bg-orange-500 p-2 rounded-full text-white shadow-md cursor-pointer">
                <Camera size={18} />
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="px-5 mt-8 space-y-4">

            {/* Full Name */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 w-5 h-5" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Full Name"
                className="w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 w-5 h-5" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="Email Address"
                className="w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Mobile */}
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 w-5 h-5" />
              <input
                type="text"
                value={formData.phone}
                disabled
                placeholder="Mobile Number"
                className="w-full pl-12 pr-4 py-4 border rounded-xl bg-gray-50 text-gray-500 focus:outline-none"
              />
            </div>

            {/* DOB */}
            <div className="relative flex items-center">
              <Calendar className="absolute left-4 text-orange-500 w-5 h-5" />
              <input
                type="text"
                value={formData.dob}
                onChange={(e) => {
                  const value = e.target.value;
                  const clean = value.replace(/\D/g, "");
                  let formatted = "";
                  if (clean.length > 0) {
                    formatted += clean.substring(0, 2);
                  }
                  if (clean.length > 2) {
                    formatted += " / " + clean.substring(2, 4);
                  }
                  if (clean.length > 4) {
                    let yearVal = clean.substring(4, 8);
                    if (yearVal.length === 4) {
                      const currentYear = new Date().getFullYear();
                      if (parseInt(yearVal, 10) > currentYear) {
                        yearVal = currentYear.toString();
                      }
                    }
                    formatted += " / " + yearVal;
                  }
                  handleChange("dob", formatted);
                }}
                placeholder="DD / MM / YYYY"
                maxLength={14}
                className="w-full pl-12 pr-12 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div className="absolute right-4 w-6 h-6 flex items-center justify-center cursor-pointer">
                <input
                  type="date"
                  max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const [year, month, day] = val.split("-");
                    handleChange("dob", `${day} / ${month} / ${year}`);
                  }}
                />
              </div>
            </div>

            {/* Time */}
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 w-5 h-5" />
              <input
                type="time"
                value={formData.tob}
                onChange={(e) => handleChange("tob", e.target.value)}
                className="w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* City */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 w-5 h-5" />
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="City"
                className="w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            
            {/* State */}
            <div className="relative">
              <Map className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 w-5 h-5" />
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                placeholder="State"
                className="w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Country */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 w-5 h-5" />
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="Country"
                className="w-full pl-12 pr-4 py-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Gender */}
            <div className="relative">
              <select
                value={formData.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                className="w-full px-4 py-4 border rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              >
                <option>Select Gender</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 pointer-events-none" />
            </div>

            {/* Address */}
            <div className="relative">
              <MapPin className="absolute left-4 top-6 text-orange-500 w-5 h-5" />
              <textarea
                rows="3"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Address"
                className="w-full pl-12 pr-4 py-4 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
              ></textarea>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSingleSave}
              disabled={isUpdating}
              className={`w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl text-lg font-semibold shadow-lg transition cursor-pointer ${
                isUpdating ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>

          </div>
        </div>

        {/* Bottom Navigation */}
        <Bottomnav />

        {/* Cool Custom Popup Modal */}
        {popup.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl relative border border-orange-100 flex flex-col items-center text-center transform transition-all duration-300 scale-100">
              <button
                onClick={closePopup}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon Header */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                popup.type === "success" 
                  ? "bg-gradient-to-tr from-emerald-100 to-green-50 text-emerald-600 shadow-md shadow-emerald-100" 
                  : "bg-gradient-to-tr from-rose-100 to-red-50 text-rose-600 shadow-md shadow-rose-100"
              }`}>
                {popup.type === "success" ? (
                  <CheckCircle2 className="w-9 h-9" />
                ) : (
                  <AlertCircle className="w-9 h-9" />
                )}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {popup.title}
              </h3>

              {/* Message */}
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                {popup.message}
              </p>

              {/* Action Button */}
              <button
                onClick={closePopup}
                className={`w-full py-3.5 px-6 rounded-2xl font-semibold text-white shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  popup.type === "success"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-200"
                    : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-red-200"
                }`}
              >
                {popup.type === "success" ? "Continue" : "Got It"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}