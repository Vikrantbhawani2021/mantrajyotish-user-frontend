import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { BACKEND_URL } from "../config/backend";

export default function ChatHistoryDetails() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(location.state?.session || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // 1. Fetch Session details if not passed via route state
        if (!session) {
          const detailRes = await fetch(`${BACKEND_URL}/api/chat/details/${sessionId}`, { headers });
          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            if (detailJson.success && detailJson.data) {
              const s = detailJson.data;
              const dateStr = s.startTime || s.createdAt || new Date();
              setSession({
                id: s._id,
                name: s.astrologer?.name || "Astrologer",
                avatar: s.astrologer?.profileImage || "",
                date: new Date(dateStr).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }),
                duration: `${s.totalDurationMinutes || 0} min`,
                total: `₹${s.totalAmountDeducted || 0}`
              });
            }
          }
        }

        // 2. Fetch Chat Messages history log
        const historyRes = await fetch(`${BACKEND_URL}/api/chat/history/${sessionId}`, { headers });
        if (historyRes.ok) {
          const historyJson = await historyRes.json();
          if (historyJson.success && Array.isArray(historyJson.data)) {
            setMessages(historyJson.data);
          }
        }
      } catch (err) {
        console.error("Error loading chat history details:", err);
      } finally {
        setLoading(false);
      }
    };
    loadChatHistory();
  }, [sessionId, session]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex justify-center">
      <div className="w-full max-w-[430px] bg-white flex flex-col min-h-screen shadow-lg relative">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-4 pt-12 pb-4 text-white flex items-center gap-3 shadow-md flex-shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl transition-all active:scale-95 cursor-pointer flex-shrink-0"
          >
            <FiArrowLeft />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 border border-white/40 flex-shrink-0 flex items-center justify-center font-bold text-orange-600">
              {session?.avatar ? (
                <img src={session.avatar} alt={session.name} className="w-full h-full object-cover" />
              ) : (
                session?.name?.charAt(0).toUpperCase() || "A"
              )}
            </div>
            <div>
              <h2 className="text-[17px] font-bold leading-tight">{session?.name || "Astro Chat History"}</h2>
              <p className="text-[11px] text-orange-100/90 font-medium">
                {session?.date || "Completed Session"} • {session?.duration || "0 min"}
              </p>
            </div>
          </div>
        </div>

        {/* Message Log Bubble Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF6F2]">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <span className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-sm text-gray-400">
              No messages found in this chat session history.
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.senderType === "USER";
              return (
                <div 
                  key={msg._id} 
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[75%] px-4 py-2.5 rounded-[20px] shadow-sm text-[14px] leading-relaxed ${
                      isUser 
                        ? "bg-[#ff7448] text-white rounded-tr-sm" 
                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                    }`}
                  >
                    {msg.messageType === "text" ? (
                      <p>{msg.text}</p>
                    ) : msg.messageType === "image" ? (
                      <img src={msg.mediaUrl} alt="Chat media" className="rounded-lg max-w-full max-h-48 object-cover" />
                    ) : msg.messageType === "kundli" ? (
                      <div className="bg-orange-50/50 p-2.5 rounded-xl border border-orange-100/60 text-gray-800">
                        <span className="font-bold text-[12px] text-orange-600 uppercase tracking-wider block mb-1">Kundli Profile Shared</span>
                        <p className="text-[13px]">{msg.text}</p>
                      </div>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                    <span 
                      className={`text-[9px] block mt-1 text-right ${
                        isUser ? "text-orange-100" : "text-gray-400"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Total Paid Summary */}
        <div className="bg-white border-t border-gray-100 px-5 py-4 flex justify-between items-center text-[13px] text-gray-500 font-semibold flex-shrink-0 rounded-t-3xl shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <span>Total Paid for Session:</span>
          <span className="text-[18px] font-extrabold text-[#ff7448]">{session?.total || "₹0"}</span>
        </div>
      </div>
    </div>
  );
}
