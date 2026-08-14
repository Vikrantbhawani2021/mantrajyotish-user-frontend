import React, { useState, useEffect } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import HistoryCard from "../component/HistoryCard";

const mockHistory = [
  {
    id: 1,
    name: "Astro Raj",
    type: "Chat Session",
    mode: "chat",
    date: "20 Feb 2026",
    duration: "12 min",
    price: "₹15 / min",
    total: "₹180",
    status: "Completed",
  },
  {
    id: 2,
    name: "Astro Neha",
    type: "Call Session",
    mode: "call",
    date: "18 Feb 2026",
    duration: "8 min",
    price: "₹25 / min",
    total: "₹200",
    status: "Completed",
  },
  {
    id: 3,
    name: "Astro Vikram",
    type: "Call Session",
    mode: "call",
    date: "15 Feb 2026",
    duration: "5 min",
    price: "₹30 / min",
    total: "₹150",
    status: "Cancelled",
  },
];

export default function AstroHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const getUserId = () => {
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      return userObj._id || userObj.id || "";
    } catch {
      return "";
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      const userId = getUserId();
      if (!userId) {
        setHistory(mockHistory);
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem("authToken");
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        // Fetch both chat sessions and video/audio sessions in parallel
        const [chatRes, callRes] = await Promise.allSettled([
          fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/chat/sessions?userId=${userId}`, { headers }),
          fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/video-session/history?userId=${userId}&role=user`, { headers })
        ]);

        let formattedChats = [];
        let formattedCalls = [];

        if (chatRes.status === "fulfilled" && chatRes.value.ok) {
          const chatJson = await chatRes.value.json();
          if (chatJson.success && chatJson.data) {
            formattedChats = chatJson.data.map(session => {
              const dateStr = session.startTime || session.createdAt || new Date();
              return {
                id: session._id,
                name: session.astrologerId?.name || "Astrologer",
                type: "Chat Session",
                mode: "chat",
                dateObj: new Date(dateStr),
                date: new Date(dateStr).toLocaleDateString([], {
                  day: 'numeric', month: 'short', year: 'numeric'
                }),
                duration: `${session.totalDurationMinutes || 0} min`,
                price: `₹${session.perMinuteRate || 0} / min`,
                total: `₹${session.totalAmountDeducted || 0}`,
                status: session.status === 'COMPLETED' ? 'Completed' : session.status
              };
            });
          }
        }

        if (callRes.status === "fulfilled" && callRes.value.ok) {
          const callJson = await callRes.value.json();
          if (callJson.success && callJson.data) {
            formattedCalls = callJson.data.map(session => {
              const dateStr = session.startTime || session.createdAt || new Date();
              return {
                id: session._id,
                name: session.astrologer?.name || "Astrologer",
                type: `${session.callType === 'VIDEO' ? 'Video' : 'Audio'} Call`,
                mode: "call",
                dateObj: new Date(dateStr),
                date: new Date(dateStr).toLocaleDateString([], {
                  day: 'numeric', month: 'short', year: 'numeric'
                }),
                duration: `${session.totalDurationMinutes || 0} min`,
                price: `₹${session.astrologer?.consultationFee || session.perMinuteRate || 0} / min`,
                total: `₹${session.totalAmountDeducted || 0}`,
                status: session.status === 'COMPLETED' ? 'Completed' : session.status
              };
            });
          }
        }

        const combined = [...formattedChats, ...formattedCalls];
        if (combined.length > 0) {
          combined.sort((a, b) => b.dateObj - a.dateObj);
          setHistory(combined);
        } else {
          setHistory(mockHistory);
        }
      } catch (err) {
        console.error("Fetch history error:", err);
        setHistory(mockHistory);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex justify-center">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-b-[35px] shadow-md px-5 pt-12 pb-6 relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-5 top-12 text-white text-2xl"
          >
            <FiArrowLeft />
          </button>
          
          <div className="text-center">
            <h1 className="text-white text-2xl font-bold">
              Astro History
            </h1>
            <p className="text-orange-100 text-sm mt-1">
              Your past consultations and calls
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <span className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : (
            history.map((item) => (
              <HistoryCard key={item.id} item={item} />
            ))
          )}
        </div>

      </div>
    </div>
  );
}