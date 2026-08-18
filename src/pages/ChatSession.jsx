import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, MoreVertical, Send, CheckCheck, Plus, Calendar, AlertTriangle, Clock, Wallet } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/backend";

const CakeIcon = () => (
  <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
    <path d="M4 16h16" />
    <path d="M12 9V5" />
    <path d="M12 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
  </svg>
);

const formatDobToLong = (dobStr) => {
  if (!dobStr) return "14 Aug 2001";
  const parts = dobStr.replace(/\s+/g, "").split("/");
  if (parts.length < 3) return dobStr;
  const day = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[2];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (isNaN(day) || isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return dobStr;
  return `${day} ${months[monthIdx]} ${year}`;
};

export default function ChatSession() {
  const navigate = useNavigate();
  const { name } = useParams();
  const location = useLocation();
  const { isLoggedIn, triggerLoginModal } = useAuth();

  const astrologer = location.state?.astrologer || {
    id: "65b839cd49b29e00192e01a4",
    name: name || "Vikram",
    price: "₹15/min",
    priceRaw: 15,
    image: "https://randomuser.me/api/portraits/women/65.jpg",
  };

  const sessionId = location.state?.sessionId;
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = userObj._id || userObj.id || "";

  const [messages, setMessages] = useState([]);
  const [showDobModal, setShowDobModal] = useState(true);
  const [tempDob, setTempDob] = useState(() => {
    return localStorage.getItem("dob") || "14/08/2001";
  });

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("PENDING"); // PENDING, ACTIVE, COMPLETED
  const [remainingBalance, setRemainingBalance] = useState(null);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [submittingRate, setSubmittingRate] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket Connection and API Setup
  useEffect(() => {
    if (!isLoggedIn) {
      triggerLoginModal("Chat Session", `/chat`);
      return;
    }

    if (!sessionId) {
      alert("Invalid Chat Session. Redirecting to chat list.");
      navigate("/chat");
      return;
    }

    // Connect to Socket server
    const token = localStorage.getItem("authToken");
    socketRef.current = io(BACKEND_URL, {
      transports: ["polling", "websocket"],
      auth: {
        token: token
      }
    });

    const socket = socketRef.current;
    const userObj = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = userObj._id || userObj.id || "";

    // Join room immediately if already connected, and also on reconnect
    const cleanSessionId = typeof sessionId === "string" ? sessionId : (sessionId?._id || sessionId?.sessionId || "");
    const emitJoinRooms = () => {
      if (!cleanSessionId) return;
      if (userId) {
        socket.emit("register_user", { userId });
        socket.emit("register_user", userId);
        socket.emit("join_user", `user_${userId}`);
      }
      socket.emit("join_session", { sessionId: cleanSessionId, roomId: cleanSessionId, chatId: cleanSessionId });
      socket.emit("join_session", cleanSessionId);
      socket.emit("join_session", `session_${cleanSessionId}`);
      socket.emit("join_room", cleanSessionId);
      socket.emit("join_room", `session_${cleanSessionId}`);
      socket.emit("join_room", `chat_${cleanSessionId}`);
      socket.emit("join_room", `room_${cleanSessionId}`);
      socket.emit("join", cleanSessionId);
      socket.emit("join", `session_${cleanSessionId}`);
    };

    if (socket.connected) {
      console.log("Connected on mount, joining room directly.");
      emitJoinRooms();
    }

    socket.on("connect", () => {
      console.log("Connected to Chat Socket:", socket.id);
      emitJoinRooms();
    });

    // Catch-all socket event listener for debugging & complete message coverage
    socket.onAny((eventName, data) => {
      if (eventName.toLowerCase().includes("message") || eventName.toLowerCase().includes("receive")) {
        console.log("💬 [User Socket Event Received]:", eventName, data);
      }
    });

    // Listen for incoming messages
    const handleReceiveMsgUser = (msg) => {
      if (!msg) return;
      
      const extractId = (obj) => {
        if (!obj) return "";
        if (typeof obj === "string" || typeof obj === "number") return String(obj);
        return String(obj.sessionId || obj.chatId || obj.roomId || obj._id || obj.id || (obj.session && (typeof obj.session === "object" ? (obj.session._id || obj.session.id) : obj.session)) || "");
      };

      const cleanMsgSessionId = extractId(msg.sessionId || msg.chatId || msg.roomId || msg.session || msg);
      const activeCleanId = extractId(sessionId);

      if (activeCleanId && cleanMsgSessionId && String(cleanMsgSessionId) !== String(activeCleanId)) {
        console.log(`🗑️ Discarding message meant for session ${cleanMsgSessionId} (Current session is ${activeCleanId})`);
        return;
      }

      const isUserMsg = String(msg.senderType || msg.role || "").toUpperCase() === "USER";

      // Hide waiting screen ONLY if message is from the ASTROLOGER (not on user's own DOB message)
      if (!isUserMsg) {
        setSessionStatus("ACTIVE");
      }
      
      const msgText = msg.text || msg.message || msg.content || "";
      if (!msgText && !msg.mediaUrl) return;

      const msgId = String(msg._id || msg.id || "msg_" + Date.now());

      setMessages((prev) => {
        try {
          if (!Array.isArray(prev)) return [];
          const senderRole = isUserMsg ? "user" : "astrologer";
          const trimmedText = msgText.trim();

          // 1. Avoid duplicate by ID
          if (msgId && prev.some((m) => m && String(m.id || m._id || "") === msgId)) return prev;

          // 2. Check if matching message exists by sender & text (temp message or unconfirmed message)
          const matchIndex = prev.findIndex(
            (m) =>
              m &&
              m.sender === senderRole &&
              (m.text || "").toString().trim() === trimmedText
          );

          if (matchIndex !== -1) {
            const updated = [...prev];
            updated[matchIndex] = {
              id: msgId,
              sender: senderRole,
              text: msgText,
              image: msg.mediaUrl,
              time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            };
            return updated;
          }

          return [
            ...prev,
            {
              id: msgId,
              sender: senderRole,
              text: msgText,
              image: msg.mediaUrl,
              time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ];
        } catch (e) {
          console.error("Error parsing receive_message socket callback:", e);
          return prev;
        }
      });
    };

    socket.on("receive_message", handleReceiveMsgUser);

    socket.on("chat_accepted", (data) => {
      console.log("💬 Chat request accepted by astrologer:", data);
      setSessionStatus("ACTIVE");
    });

    socket.on("chat_request_created", (data) => {
      console.log("💬 Chat request created:", data);
    });

    // Listen for active state / tick / acceptance events
    socket.on("session_active", () => {
      setSessionStatus("ACTIVE");
    });

    socket.on("accept_chat_request", () => {
      setSessionStatus("ACTIVE");
    });

    socket.on("accept_request", () => {
      setSessionStatus("ACTIVE");
    });

    socket.on("chat_accepted", () => {
      setSessionStatus("ACTIVE");
    });

    socket.on("timer_tick", (data) => {
      setSessionStatus("ACTIVE");
      setRemainingBalance(data.remainingBalance);
      setElapsedMinutes(data.elapsedMinutes);
    });

    // Wallet warning (1 minute remaining)
    socket.on("wallet_warning", (msg) => {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 8000);
    });

    // Chat ended event
    const handleChatEnded = (data) => {
      console.log("Chat ended event received on socket:", data);
      alert(data?.message || "This chat session has ended.");
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      navigate("/chat");
    };

    socket.on("chat_ended", handleChatEnded);
    socket.on("session_ended", handleChatEnded);
    socket.on("chat_session_ended", handleChatEnded);
    socket.on("end_chat", handleChatEnded);
    socket.on("end_session", handleChatEnded);

    // Fetch chat history using API helper
    const fetchHistory = async () => {
      try {
        const resData = await getHistory(sessionId);
        if (resData && resData.success && Array.isArray(resData.data)) {
          const historyMessages = resData.data.map((msg) => ({
            id: String(msg._id || msg.id),
            sender: String(msg.senderType || msg.role || "").toLowerCase() === "user" ? "user" : "astrologer",
            text: msg.text || msg.message || msg.content || "",
            image: msg.mediaUrl,
            time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }));

          if (historyMessages.some((m) => m.sender === "astrologer")) setSessionStatus("ACTIVE");

          setMessages((prev) => {
            if (!Array.isArray(prev) || prev.length === 0) return historyMessages;
            let updated = [...prev];
            let hasChanges = false;

            for (const h of historyMessages) {
              if (!h) continue;
              const existsById = updated.some((p) => String(p.id || p._id || "") === String(h.id));
              if (existsById) continue;

              const matchIdx = updated.findIndex(
                (p) => p.sender === h.sender && (p.text || "").toString().trim() === (h.text || "").toString().trim()
              );

              if (matchIdx !== -1) {
                updated[matchIdx] = h;
                hasChanges = true;
              } else {
                updated.push(h);
                hasChanges = true;
              }
            }

            return hasChanges ? updated : prev;
          });
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };

    // Fallback REST polling for status transition and chat message sync
    const statusPoll = setInterval(async () => {
      try {
        // Sync history continuously
        fetchHistory();

        const userObj = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = userObj._id || userObj.id || "";
        if (!userId) return;

        const resData = await getSessionsForUser(userId);
        if (resData && resData.success && resData.data) {
          const currentSession = resData.data.find(s => s._id === sessionId || s.id === sessionId);
          if (currentSession && (currentSession.status === "ACTIVE" || currentSession.status === "COMPLETED" || currentSession.status === "ENDED")) {
            const finalStatus = currentSession.status === "ENDED" ? "COMPLETED" : currentSession.status;
            setSessionStatus((prev) => {
              if (prev !== finalStatus) {
                console.log("Session status dynamically updated via poll:", finalStatus);
                if (finalStatus === "COMPLETED") {
                  alert("This chat session has been completed by the astrologer.");
                  if (socketRef.current) {
                    socketRef.current.disconnect();
                  }
                  navigate("/chat");
                }
                return finalStatus;
              }
              return prev;
            });
          }
        }
      } catch (e) {
        console.error("Status poll error:", e);
      }
    }, 2500);

    fetchHistory();

    return () => {
      if (socket) {
        socket.disconnect();
      }
      clearInterval(statusPoll);
    };
  }, [sessionId, isLoggedIn]);

  const handleConfirmDob = () => {
    setShowDobModal(false);
    
    // Emit initial DoB message through socket
    const formattedDob = formatDobToLong(tempDob);
    const dobText = `🎂 My Date of Birth is ${formattedDob}`;
    const token = localStorage.getItem("authToken");

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("send_message", {
        sessionId: sessionId,
        chatId: sessionId,
        roomId: sessionId,
        senderId: userId,
        senderType: "USER",
        text: dobText,
        messageType: "text"
      });
    } else {
      sendMessage({ sessionId, senderId: userId, senderType: "USER", text: dobText, messageType: "text" }).catch((err) => console.error("DOB send message REST API error:", err));
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const msgText = inputMessage;
    const token = localStorage.getItem("authToken");

    // 1. Emit via Socket if connected
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("send_message", {
        sessionId: sessionId,
        chatId: sessionId,
        roomId: sessionId,
        senderId: userId,
        senderType: "USER",
        text: msgText,
        messageType: "text"
      });
    } else {
      sendMessage({ sessionId, senderId: userId, senderType: "USER", text: msgText, messageType: "text" }).catch((err) => console.error("User send message REST API error:", err));
    }

    // Optimistic locally added message
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const tempId = "temp_" + Date.now();

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: "user",
        text: msgText,
        time: formattedTime,
        status: "sent"
      }
    ]);
    setInputMessage("");
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file only.");
      return;
    }

    setLoading(true);
      try {
        const formDataObj = new FormData();
        formDataObj.append("image", file);
        const resData = await uploadImage(formDataObj);
        if (resData && resData.success) {
          const imageUrl = resData.data.imageUrl || resData.imageUrl || resData.data.url;
          if (socketRef.current) {
            socketRef.current.emit("send_message", {
              sessionId: sessionId,
              chatId: sessionId,
              roomId: sessionId,
              senderId: userId,
              senderType: "USER",
              text: "",
              mediaUrl: imageUrl,
              messageType: "image"
            });
          }
        } else {
          alert(resData?.message || "Failed to upload image.");
        }
      } catch (err) {
        console.error("Image Upload Error:", err);
        alert(`Image upload failed: ${err.message}`);
      } finally {
        setLoading(false);
      }
  };

  const handleEndChat = async () => {
    try {
      if (socketRef.current) socketRef.current.emit("end_chat_session", { sessionId });
      const resData = await endChat(sessionId);
      if (resData && resData.success) {
        setSessionStatus("COMPLETED");
        setSummaryData({
          totalDurationMinutes: resData.data?.totalDurationMinutes || elapsedMinutes,
          totalAmountDeducted: resData.data?.totalAmountDeducted || (elapsedMinutes * astrologer.priceRaw),
          astrologerEarnings: resData.data?.astrologerEarnings || 0
        });
        setShowConfirmEnd(false);
        setShowSummaryModal(true);
        if (socketRef.current) socketRef.current.disconnect();
      } else {
        alert(resData?.message || "Failed to end chat session.");
      }
    } catch (error) {
      console.error("Error ending chat:", error);
      // Local fallback in case of connection failure
      setSessionStatus("COMPLETED");
      setSummaryData({
        totalDurationMinutes: elapsedMinutes,
        totalAmountDeducted: elapsedMinutes * astrologer.priceRaw,
        astrologerEarnings: 0
      });
      setShowConfirmEnd(false);
      setShowSummaryModal(true);
      if (socketRef.current) socketRef.current.disconnect();
    }
  };

  const handleRateSession = async () => {
    setSubmittingRate(true);
    try {
      const resData = await rateChat({ sessionId, rating, review });
      if (resData && resData.success) alert("Thank you for your rating!");
      else alert(resData?.message || "Failed to submit rating.");
    } catch (err) {
      console.error("Rating Error:", err);
    } finally {
      setSubmittingRate(false);
      setShowSummaryModal(false);
      navigate("/chat");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[430px] h-screen bg-[#FAFAFA] relative shadow-xl flex flex-col justify-between overflow-hidden">
        
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (sessionStatus === "ACTIVE") {
                  setShowConfirmEnd(true);
                } else {
                  navigate("/chat");
                }
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft size={24} className="text-gray-700" />
            </button>
            
            <div className="relative">
              <img
                src={astrologer.image}
                alt={astrologer.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>

            <div>
              <h2 className="font-bold text-[#1d2340] text-base leading-tight">
                {astrologer.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                <span className="text-xs text-gray-500">
                  {sessionStatus === "PENDING" ? "Connecting..." : `Session Active (${elapsedMinutes} min)`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {remainingBalance !== null && (
              <div className="flex items-center gap-1 bg-orange-50 border border-orange-100 px-2 py-1.5 rounded-xl text-orange-600">
                <Wallet size={12} />
                <span className="text-[10px] font-bold">₹{Math.floor(remainingBalance)}</span>
              </div>
            )}
            <span className="bg-[#FF6F3D] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              {astrologer.price}
            </span>
          </div>
        </div>

        {/* Low balance warning banner */}
        {showWarning && (
          <div className="bg-red-50 border-b border-red-100 text-red-700 px-4 py-2 text-xs flex items-center gap-2 animate-pulse z-10">
            <AlertTriangle size={14} className="text-red-500" />
            <span>Warning: Insufficient wallet balance. Chat will automatically end in 1 minute.</span>
          </div>
        )}

        {/* Waiting / Connecting Screen Overlay */}
        {sessionStatus === "PENDING" && !showDobModal && (
          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-orange-50 rounded-full border-4 border-orange-100/50 flex items-center justify-center shadow-inner mb-6 relative">
              <Clock size={36} className="text-[#FF6F3D] animate-spin-slow" />
            </div>
            <h3 className="text-lg font-bold text-[#1d2340]">Waiting for Astrologer</h3>
            <p className="text-gray-500 text-xs mt-2 px-6 leading-relaxed">
              Astrologer is accepting your chat session request. This normally takes 15-30 seconds.
            </p>
            <button
              onClick={() => {
                if (socketRef.current) socketRef.current.disconnect();
                navigate("/chat");
              }}
              className="mt-8 px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer"
            >
              Cancel Request
            </button>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#FAFAFA]">
          {messages.length > 0 && (
            <div className="flex justify-center my-4">
              <span className="bg-gray-200/60 text-gray-600 text-xs px-4 py-1 rounded-full font-medium">
                Today
              </span>
            </div>
          )}

          {messages.map((msg) => {
            const isAstrologer = msg.sender === "astrologer";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  isAstrologer ? "mr-auto" : "ml-auto flex-row-reverse"
                }`}
              >
                {isAstrologer && (
                  <img
                    src={astrologer.image}
                    alt={astrologer.name}
                    className="w-8 h-8 rounded-full object-cover mt-1 self-start flex-shrink-0"
                  />
                )}
                
                <div
                  className={`p-3 rounded-2xl shadow-sm relative ${
                    isAstrologer
                      ? "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                      : "bg-[#FFF2EC] text-gray-800 rounded-tr-none"
                  }`}
                >
                  {msg.image ? (
                    <img
                      src={msg.image}
                      alt="Uploaded image"
                      className="max-w-[200px] max-h-[200px] rounded-lg object-cover mb-1"
                    />
                  ) : (
                    <p className="text-[14px] leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-gray-400">
                      {msg.time}
                    </span>
                    {!isAstrologer && (
                      <CheckCheck size={14} className={msg.status === "read" ? "text-[#FF6F3D]" : "text-gray-400"} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={handleSendMessage}
          className="p-4 bg-[#FAFAFA] border-t border-gray-100 flex items-center sticky bottom-0"
        >
          <div className="flex-1 bg-white rounded-full shadow-md border border-gray-200/60 p-1.5 pl-2 pr-2 flex items-center">
            <label
              htmlFor="image-upload"
              className="w-9 h-9 rounded-full bg-[#FFF2EC] hover:bg-[#ffe5d9] flex items-center justify-center text-[#FF6F3D] cursor-pointer active:scale-95 transition-all flex-shrink-0"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Plus size={18} strokeWidth={2.5} />
              )}
            </label>
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={loading}
            />

            <input
              type="text"
              placeholder="Type a message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400 ml-3"
            />
            <button
              type="submit"
              className="ml-2 w-9 h-9 rounded-full bg-[#FF6F3D] hover:bg-[#e05e30] flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all shadow-md shadow-orange-500/20"
            >
              <Send size={16} className="fill-white translate-x-[1px]" />
            </button>
          </div>
        </form>

        {/* DOB Confirmation Modal */}
        {showDobModal && (() => {
          const formattedDob = formatDobToLong(tempDob);
          return (
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] z-30 flex items-center justify-center p-6">
              <div className="bg-white rounded-[32px] w-full max-w-[340px] p-6 text-center shadow-2xl animate-fade-in flex flex-col items-center">
                <div className="w-20 h-20 bg-orange-50 rounded-full border-4 border-orange-100/50 flex items-center justify-center shadow-inner mt-2">
                  <Calendar size={36} className="text-[#FF6F3D]" />
                </div>

                <h3 className="text-xl font-bold text-[#1d2340] mt-5 leading-tight">
                  Confirm Your<br />Date of Birth
                </h3>

                <p className="text-gray-500 text-[13px] mt-2.5 px-2 leading-relaxed">
                  Please confirm your Date of Birth before starting your conversation.
                </p>

                {/* DOB Display Card */}
                <div className="w-full bg-[#FFF2EC] border border-[#ffe0d1] rounded-2xl py-3.5 px-4 flex items-center justify-center gap-2 mt-5 relative cursor-pointer hover:bg-[#ffe0d1] transition-colors">
                  <CakeIcon />
                  <span className="text-[#1d2340] font-bold text-lg leading-none">
                    {formattedDob}
                  </span>
                  <input
                    type="date"
                    max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const [year, month, day] = val.split("-");
                      const newDob = `${day}/${month}/${year}`;
                      setTempDob(newDob);
                      localStorage.setItem("dob", newDob);
                    }}
                  />
                </div>

                <p className="text-[11px] text-gray-400 mt-4 leading-normal">
                  You won't be able to change this<br />during this chat session.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3 w-full mt-6 mb-2">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-gray-500 text-sm active:scale-95 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDob}
                    className="flex-1 py-3 bg-[#FF6F3D] hover:bg-[#e05e30] rounded-xl font-bold text-white text-sm shadow-md shadow-orange-500/15 active:scale-95 transition-all cursor-pointer"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Manual Confirm End Session Modal */}
        {showConfirmEnd && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-30 flex items-center justify-center p-6">
            <div className="bg-white rounded-[30px] w-full max-w-[320px] p-6 text-center shadow-2xl animate-fade-in flex flex-col items-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle size={32} />
              </div>
              <h4 className="text-lg font-bold text-gray-900">End Chat Session?</h4>
              <p className="text-gray-500 text-xs mt-2 px-2 leading-relaxed">
                Are you sure you want to end this conversation with {astrologer.name}? Your billing will stop immediately.
              </p>
              <div className="flex gap-3 w-full mt-6">
                <button
                  onClick={() => setShowConfirmEnd(false)}
                  className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 active:scale-95 transition-all cursor-pointer"
                >
                  No, Continue
                </button>
                <button
                  onClick={handleEndChat}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  Yes, End Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Modal after completion */}
        {showSummaryModal && summaryData && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] z-40 flex items-center justify-center p-6">
            <div className="bg-white rounded-[32px] w-full max-w-[340px] p-6 text-center shadow-2xl animate-fade-in flex flex-col items-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4">
                <CheckCheck size={32} />
              </div>
              <h4 className="text-xl font-bold text-[#1d2340]">Chat Session Summary</h4>
              <p className="text-gray-400 text-xs mt-1">Thank you for consulting {astrologer.name}!</p>
              
              <div className="w-full bg-[#FAFAFA] rounded-2xl p-4 space-y-3 mt-5 border border-gray-100">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Consultant</span>
                  <span className="font-semibold text-gray-800">{astrologer.name}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Chat Duration</span>
                  <span className="font-semibold text-gray-800">{summaryData.totalDurationMinutes} minutes</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Deduction Rate</span>
                  <span className="font-semibold text-gray-800">{astrologer.price}</span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                  <span>Total Cost</span>
                  <span className="text-[#FF6F3D]">₹{Math.floor(summaryData.totalAmountDeducted)}</span>
                </div>
              </div>

              {/* Rating Section */}
              <div className="w-full mt-4 flex flex-col items-center">
                <span className="text-xs font-bold text-gray-600 mb-2">Rate your consultation</span>
                <div className="flex gap-1.5 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="cursor-pointer transform hover:scale-110 active:scale-95 transition-transform"
                    >
                      <svg
                        className={`w-7 h-7 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 17.75l-6.172 3.245 1.179-6.873-4.993-4.867 6.9-1.002L12 2l3.086 6.253 6.9 1.002-4.993 4.867 1.179 6.873z" />
                      </svg>
                    </button>
                  ))}
                </div>
                
                {/* Review Text Area */}
                <textarea
                  placeholder="Write a brief review... (optional)"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="w-full mt-3.5 p-3 border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-400 resize-none h-16 bg-gray-50/50"
                ></textarea>
              </div>

              <button
                onClick={handleRateSession}
                disabled={submittingRate}
                className="w-full mt-5 py-3 bg-[#FF6F3D] hover:bg-[#e05e30] rounded-xl font-bold text-white text-sm shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submittingRate ? "Submitting..." : "Submit Review & Exit"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSummaryModal(false);
                  navigate("/chat");
                }}
                className="mt-3 text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Skip Rating
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
          }
          .animate-spin-slow {
            animation: spin 3s linear infinite;
          }
        `}</style>

      </div>
    </div>
  );
}
