import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, MoreVertical, Send, CheckCheck, Plus, Calendar, AlertTriangle, Clock, Wallet, ChevronUp, ChevronDown, User, MapPin, Star, PhoneOff, Copy } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../config/backend";
import { endChat, rateChat, initiateChat, sendMessage, getHistory, getSessionsForUser } from "../api/chat";
import { apiFetch } from "../api/client";

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
  const { name, sessionId: routeSessionId } = useParams();
  const location = useLocation();
  const { isLoggedIn, triggerLoginModal } = useAuth();

  const [astrologer, setAstrologer] = useState(() => location.state?.astrologer || {
    id: "65b839cd49b29e00192e01a4",
    name: name || "Vikram",
    price: "₹9/min",
    priceRaw: 9,
    image: "https://randomuser.me/api/portraits/women/65.jpg",
    skill: "Vedic Astrology, Kundli, Tarot Reading",
    exp: "8 Years",
    rating: "4.9",
  });

  const [currentSessionId, setCurrentSessionId] = useState(location.state?.sessionId || routeSessionId || null);
  const sessionId = currentSessionId;
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = userObj._id || userObj.id || "";

  useEffect(() => {
    if (!location.state?.sessionId && routeSessionId) {
      apiFetch(`/api/chat/details/${routeSessionId}`)
        .then(res => {
          const session = res.session || res.data || res;
          if (session) {
            setCurrentSessionId(routeSessionId);
            if (session.astrologer) {
              setAstrologer(session.astrologer);
            }
            if (session.status) {
              setSessionStatus(session.status);
            }
          }
        })
        .catch(err => {
          console.error("Failed to load secure chat session details:", err);
          alert("Could not load secure chat room: unauthorized or invalid link");
        });
    }
  }, [routeSessionId]);

  const [messages, setMessages] = useState([]);
  const [customPopup, setCustomPopup] = useState(null); // { title, message, type, onConfirm }
  const showCustomPopup = (title, message, type = "info", onConfirm = null) => {
    setCustomPopup({ title, message, type, onConfirm });
  };
  const [showDobModal, setShowDobModal] = useState(() => {
    if (sessionId) {
      const confirmed = localStorage.getItem(`dob_confirmed_${sessionId}`);
      if (confirmed === "true") return false;
    }
    return true;
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tempDob, setTempDob] = useState(() => {
    const localDob = localStorage.getItem("dob");
    if (localDob) return localDob;

    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.dateofbirth) {
          const dobDate = new Date(u.dateofbirth);
          if (!isNaN(dobDate.getTime())) {
            const d = String(dobDate.getDate()).padStart(2, "0");
            const m = String(dobDate.getMonth() + 1).padStart(2, "0");
            const y = dobDate.getFullYear();
            return `${d}/${m}/${y}`;
          }
        }
      } catch {}
    }
    return "14/08/2001";
  });

  // Fetch real profile DOB on mount to confirm latest value from DB
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const fetchRealDob = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (response.ok) {
          const res = await response.json();
          if (res && res.success && res.data) {
            localStorage.setItem("user", JSON.stringify(res.data));
            if (res.data.dateofbirth) {
              const dobDate = new Date(res.data.dateofbirth);
              if (!isNaN(dobDate.getTime())) {
                const d = String(dobDate.getDate()).padStart(2, "0");
                const m = String(dobDate.getMonth() + 1).padStart(2, "0");
                const y = dobDate.getFullYear();
                const newDob = `${d}/${m}/${y}`;
                setTempDob(newDob);
                localStorage.setItem("dob", newDob);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch fresh user profile DOB:", err);
      }
    };

    fetchRealDob();
  }, []);

  const [viewportHeight, setViewportHeight] = useState("100dvh");

  useEffect(() => {
    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
      } else {
        setViewportHeight(`${window.innerHeight}px`);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateHeight);
      window.visualViewport.addEventListener("scroll", updateHeight);
    } else {
      window.addEventListener("resize", updateHeight);
    }

    updateHeight();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateHeight);
        window.visualViewport.removeEventListener("scroll", updateHeight);
      } else {
        window.removeEventListener("resize", updateHeight);
      }
    };
  }, []);

  const handleInputFocus = () => {
    setTimeout(() => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      scrollToBottom(true);
    }, 150);
  };


  const cleanSessionId = typeof sessionId === "string"
    ? sessionId
    : (sessionId?._id || sessionId?.sessionId || sessionId?.id || "");

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("PENDING"); // PENDING, ACTIVE, COMPLETED
  const [remainingBalance, setRemainingBalance] = useState(() => {
    const saved = localStorage.getItem("wallet_balance");
    return saved ? parseFloat(saved) : 0;
  });
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [prevBalance, setPrevBalance] = useState(null);
  const [balanceChangeText, setBalanceChangeText] = useState(null);

  const [showWarning, setShowWarning] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submittingRate, setSubmittingRate] = useState(false);

  // Increments seconds counter every second when status is ACTIVE
  useEffect(() => {
    if (sessionStatus !== "ACTIVE") return;
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStatus]);

  // Fetch the latest wallet balance on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const fetchBalance = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/wallet/balance`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (response.ok) {
          const res = await response.json();
          if (res && res.success && res.data !== undefined) {
            const bal = res.data.walletBalance ?? res.data.balance ?? 0;
            setRemainingBalance(bal);
            localStorage.setItem("wallet_balance", Number(bal).toFixed(2));
          }
        }
      } catch (err) {
        console.warn("Failed to fetch wallet balance on mount:", err);
      }
    };
    fetchBalance();
  }, []);

  // Monitor balance decreases for animation text
  useEffect(() => {
    if (prevBalance !== null && remainingBalance < prevBalance) {
      const diff = prevBalance - remainingBalance;
      if (diff >= 0.5) {
        setBalanceChangeText(`-₹${Math.round(diff)}`);
        const timer = setTimeout(() => {
          setBalanceChangeText(null);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
    setPrevBalance(remainingBalance);
  }, [remainingBalance, prevBalance]);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 50;
    setShowScrollBottom(isScrolledUp);
  };

  const hasInitialScrollRef = useRef(false);

  const scrollToBottom = (isSmooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: isSmooth ? "smooth" : "auto",
        block: "end"
      });
    }, 100);
  };

  useEffect(() => {
    if (messages.length > 0) {
      if (!hasInitialScrollRef.current) {
        scrollToBottom(false);
        hasInitialScrollRef.current = true;
      } else {
        const lastMsg = messages[messages.length - 1];
        const sentByMe = lastMsg && lastMsg.sender !== "astrologer";
        
        let isAtBottom = true;
        if (chatContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
          // If the user has scrolled up past 300px from the bottom, isAtBottom is false
          isAtBottom = scrollHeight - scrollTop - clientHeight <= 50;
        }
        
        // Only auto-scroll to bottom if user is already at the bottom or sent the message
        if (isAtBottom || sentByMe) {
          scrollToBottom(true);
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    if (sessionId && name) {
      localStorage.setItem("active_chat_session", JSON.stringify({ name, sessionId }));
    }
  }, [sessionId, name]);

  // Socket Connection and API Setup
  useEffect(() => {
    if (!isLoggedIn) {
      triggerLoginModal("Chat Session", `/chat`);
      return;
    }

    if (!sessionId) {
      // Wait for DOB confirmation to initiate the session on backend
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
      if (data?.session?.startTime) {
        const start = new Date(data.session.startTime).getTime();
        const now = Date.now();
        const diffSeconds = Math.max(Math.floor((now - start) / 1000), 0);
        setSecondsElapsed(diffSeconds);
      }
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

    socket.on("timer_tick", (data) => {
      setSessionStatus("ACTIVE");
      setRemainingBalance(data.remainingBalance);
      setElapsedMinutes(data.elapsedMinutes);
      const seconds = data.elapsedSeconds !== undefined 
        ? data.elapsedSeconds 
        : (data.elapsedMinutes || 0) * 60;
      setSecondsElapsed(seconds);
    });

    // Wallet warning (1 minute remaining)
    socket.on("wallet_warning", (msg) => {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 8000);
    });

    // Chat ended event
    const handleChatEnded = (data) => {
      console.log("Chat ended event received on socket:", data);
      localStorage.removeItem("active_chat_session");
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      const statusUpper = String(data?.status || data?.session?.status || "COMPLETED").toUpperCase();
      if (statusUpper === "REJECTED") {
        showCustomPopup("Request Declined", "This chat request was rejected by the astrologer.", "error", () => navigate("/chat"));
      } else if (statusUpper === "CANCELLED") {
        showCustomPopup("Chat Ended", "This chat session has been cancelled.", "info", () => navigate("/chat"));
      } else {
        setSessionStatus("COMPLETED");
        setSummaryData({
          totalDurationMinutes: data?.session?.totalDurationMinutes || data?.totalDurationMinutes || elapsedMinutes,
          totalDurationSeconds: data?.session?.totalDurationSeconds || data?.totalDurationSeconds || (elapsedMinutes * 60),
          totalAmountDeducted: data?.session?.totalAmountDeducted || data?.totalAmountDeducted || (elapsedMinutes * astrologer.priceRaw),
          astrologerEarnings: data?.session?.astrologerEarnings || data?.astrologerEarnings || 0,
          sessionCode: data?.session?.sessionCode || data?.sessionCode || null
        });
        setShowSummaryModal(true);
      }
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
          if (currentSession) {
            const statusUpper = (currentSession.status || "").toUpperCase();
            
            // If the status is a final state, clear the localStorage session and cleanup
            if (statusUpper !== "PENDING" && statusUpper !== "ACTIVE") {
              localStorage.removeItem("active_chat_session");
              if (socketRef.current) {
                socketRef.current.disconnect();
              }
              
              if (statusUpper === "COMPLETED" || statusUpper === "ENDED") {
                setSessionStatus("COMPLETED");
                setSummaryData({
                  totalDurationMinutes: currentSession.totalDurationMinutes || elapsedMinutes,
                  totalDurationSeconds: currentSession.totalDurationSeconds || (elapsedMinutes * 60),
                  totalAmountDeducted: currentSession.totalAmountDeducted || (elapsedMinutes * astrologer.priceRaw),
                  astrologerEarnings: currentSession.astrologerEarnings || 0,
                  sessionCode: currentSession.sessionCode || null
                });
                setShowSummaryModal(true);
                return;
              }
              
              let title = "Chat Ended";
              let msg = "";
              if (statusUpper === "REJECTED") {
                title = "Request Declined";
                msg = "This chat request was rejected by the astrologer.";
              } else if (statusUpper === "CANCELLED") {
                msg = "This chat session has been cancelled.";
              } else {
                msg = `Chat session ended with status: ${statusUpper}`;
              }
              showCustomPopup(title, msg, statusUpper === "REJECTED" ? "error" : "info", () => navigate("/chat"));
              return;
            } else if (statusUpper === "ACTIVE") {
              setSessionStatus("ACTIVE");
            }
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

  const handleConfirmDob = async () => {
    setShowDobModal(false);
    let targetSessionId = sessionId;

    if (!targetSessionId) {
      // Initiate the session on confirm DOB
      try {
        const userObj = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = userObj._id || userObj.id || "";
        const userName = userObj.name ||
                         userObj.userName ||
                         (userObj.firstname ? `${userObj.firstname} ${userObj.lastname || ""}`.trim() : "") ||
                         localStorage.getItem("userName") ||
                         "";

        const resData = await initiateChat({ 
          userId, 
          astrologerId: astrologer.id, 
          name: userName, 
          userName 
        });

        if (resData && resData.success) {
          targetSessionId = resData.data._id || resData.data.sessionId;
          setCurrentSessionId(targetSessionId);
          localStorage.setItem("active_chat_session", JSON.stringify({ name, sessionId: targetSessionId }));
          navigate(`/chat/${targetSessionId}`, { replace: true });
        } else {
          showCustomPopup(
            resData?.message?.includes("offline") ? "Astrologer Offline" : "Request Failed", 
            resData?.message || "Failed to start chat session.", 
            "error", 
            () => navigate("/chat")
          );
          return;
        }
      } catch (err) {
        console.error("Error initiating chat on DOB confirm:", err);
        showCustomPopup("Error", "Failed to initiate chat. Please try again.", "error", () => navigate("/chat"));
        return;
      }
    }

    localStorage.setItem(`dob_confirmed_${targetSessionId}`, "true");
    
    // Emit initial DoB message through socket or API
    const formattedDob = formatDobToLong(tempDob);
    const dobText = `🎂 My Date of Birth is ${formattedDob}`;

    // Send the DOB message after socket connects
    const checkAndSendMessage = () => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("send_message", {
          sessionId: targetSessionId,
          chatId: targetSessionId,
          roomId: targetSessionId,
          senderId: userId,
          senderType: "USER",
          text: dobText,
          messageType: "text"
        });
      } else {
        sendMessage({ 
          sessionId: targetSessionId, 
          senderId: userId, 
          senderType: "USER", 
          text: dobText, 
          messageType: "text" 
        }).catch((err) => console.error("DOB send message REST API error:", err));
      }
    };

    // Delay slightly to give time for socket connection to establish if we just initialized the session
    setTimeout(checkAndSendMessage, 800);
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
    if (inputRef.current) {
      inputRef.current.style.height = "36px";
      inputRef.current.style.overflowY = "hidden";
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showCustomPopup("Invalid File", "Please select an image file only.", "warn");
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
          showCustomPopup("Upload Failed", resData?.message || "Failed to upload image.", "error");
        }
      } catch (err) {
        console.error("Image Upload Error:", err);
        showCustomPopup("Upload Error", `Image upload failed: ${err.message}`, "error");
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
        localStorage.removeItem("active_chat_session");
        setSummaryData({
          totalDurationMinutes: resData.data?.totalDurationMinutes || elapsedMinutes,
          totalDurationSeconds: resData.data?.totalDurationSeconds || (elapsedMinutes * 60),
          totalAmountDeducted: resData.data?.totalAmountDeducted || (elapsedMinutes * astrologer.priceRaw),
          astrologerEarnings: resData.data?.astrologerEarnings || 0,
          sessionCode: resData.data?.sessionCode || null
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
      localStorage.removeItem("active_chat_session");
      setSummaryData({
        totalDurationMinutes: elapsedMinutes,
        totalDurationSeconds: elapsedMinutes * 60,
        totalAmountDeducted: elapsedMinutes * astrologer.priceRaw,
        astrologerEarnings: 0
      });
      setShowConfirmEnd(false);
      setShowSummaryModal(true);
      if (socketRef.current) socketRef.current.disconnect();
    }
  };

  const handleRateSession = async () => {
    if (rating === 0) {
      showCustomPopup("Rating Required", "Please select a rating star to submit your review.", "warn");
      return;
    }
    setSubmittingRate(true);
    try {
      await rateChat({ sessionId, rating, review });
      // No alert — just navigate away cleanly
    } catch (err) {
      console.error("Rating Error:", err);
    } finally {
      setSubmittingRate(false);
      setShowSummaryModal(false);
      navigate("/chat");
    }
  };

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen min-h-[100dvh] h-[100dvh] w-full bg-gray-100 flex justify-center overflow-hidden">
      <div 
        style={{ height: viewportHeight }}
        className="w-full max-w-[850px] bg-[#FAFAFA] relative shadow-xl flex flex-col justify-between overflow-hidden"
      >
        
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-[#ff8f6c] to-[#ff5c33] border-b border-orange-500/20 px-3 py-3 sticky top-0 z-20 text-white shadow-md">
          <div className="max-w-[520px] mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2 max-w-[50%]">
              <div className="relative flex-shrink-0">
                <img
                  src={astrologer.image || astrologer.profileImage || `https://i.pravatar.cc/200?img=${((astrologer._id || astrologer.id || "1").toString().split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 70) + 1}`}
                  alt={astrologer.name}
                  className="w-10 h-10 rounded-full object-cover border border-white/20"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#ff8f6c] rounded-full"></span>
              </div>

              <div className="min-w-0">
                <h2 className="font-bold text-white text-xs md:text-sm leading-tight truncate">
                  {astrologer.name}
                </h2>
                <div className="flex items-center gap-1 mt-0.5 min-w-0">
                  <span className="text-[9px] text-orange-100 font-bold uppercase tracking-wide truncate">
                    Online
                  </span>
                  <span className="text-[9px] text-orange-200/80">•</span>
                  <span className="text-[9px] text-orange-100 font-bold truncate">
                    Rate: {astrologer.price}
                  </span>
                </div>
              </div>
            </div>

            {/* Time Elapsed Center Badge */}
            {sessionStatus === "ACTIVE" && (
              <div className="flex flex-col items-center justify-center text-center flex-shrink-0">
                <div className="flex items-center gap-1 bg-black/15 px-2 py-0.5 rounded-full text-white font-mono text-[10px] font-medium border border-white/5">
                  <Clock size={10} className="opacity-95" />
                  <span>{formatTime(secondsElapsed)}</span>
                </div>
                <span className="text-[7px] text-orange-100/80 font-bold uppercase mt-0.5 tracking-wide">Time Elapsed</span>
              </div>
            )}

            {/* Right Wallet & End call Section */}
            <div className="flex items-center gap-1.5 relative flex-shrink-0">
              {balanceChangeText && (
                <span className="absolute right-24 -bottom-1 text-xs font-black text-red-200 animate-float-up-fade">
                  {balanceChangeText}
                </span>
              )}
              {remainingBalance !== null && (
                <div 
                  className="flex items-center gap-2 bg-white rounded-xl px-2 py-0.5 border border-white/80 shadow-xs relative h-8 pr-6"
                >
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-0.5 text-gray-800 text-[10px] font-medium leading-none">
                      <Wallet size={9} className="text-gray-400" />
                      <span>₹{Number(remainingBalance).toFixed(2)}</span>
                    </div>
                    <span className="text-[6px] text-gray-400 font-bold uppercase mt-0.5 tracking-wide">Wallet Balance</span>
                  </div>
                  <button
                    onClick={() => navigate("/deposit")}
                    className="w-4 h-4 bg-[#FF6F3D] hover:bg-[#e05e30] text-white flex items-center justify-center rounded-full cursor-pointer absolute right-1 top-1/2 -translate-y-1/2 shadow-xs transition-colors active:scale-90"
                  >
                    <Plus size={8} strokeWidth={3.5} />
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowConfirmEnd(true)}
                className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-md shadow-red-600/10 flex-shrink-0"
              >
                <PhoneOff size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Low balance warning banner */}
        {showWarning && (
          <div className="mx-3 my-2 bg-[#FFF2EC] border border-[#ffe0d1] rounded-2xl p-3 flex items-center justify-between shadow-2xs animate-fade-in z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 text-[#FF6F3D]">
                <Wallet size={16} />
              </div>
              <div>
                <h4 className="text-[11px] font-extrabold text-gray-800">Low Wallet Balance</h4>
                <p className="text-[9px] text-gray-400 mt-0.5 leading-normal">
                  You have <span className="font-bold text-[#FF6F3D]">₹{Number(remainingBalance).toFixed(2)}</span> remaining.
                  <br />Add money to continue uninterrupted.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/deposit")}
              className="bg-[#FF6F3D] hover:bg-[#e05e30] text-white text-[9px] font-black px-2.5 py-1.5 rounded-xl active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-0.5"
            >
              <Plus size={8} strokeWidth={3} /> Add Money
            </button>
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
              onClick={async () => {
                try {
                  // Inform backend that the pending request is cancelled
                  await endChat(cleanSessionId);
                } catch (err) {
                  console.error("Error cancelling chat request:", err);
                }
                localStorage.removeItem("active_chat_session");
                if (socketRef.current) socketRef.current.disconnect();
                navigate("/chat");
              }}
              className="mt-8 px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-500 rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer"
            >
              Cancel Request
            </button>
          </div>
        )}
          {/* Astrologer Profile & Details Card */}
        {sessionStatus !== "PENDING" && (
          <div className={`bg-white border-l border-r border-gray-100 shadow-sm text-xs z-30 relative transition-all ${detailsOpen ? "rounded-b-none border-b-0" : "rounded-b-3xl border-b"}`}>
            <div 
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex items-center justify-between cursor-pointer p-4.5 pb-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#FFF2EC] flex items-center justify-center text-[#FF6F3D]">
                  <Star size={14} className="fill-[#FF6F3D]" />
                </div>
                <span className="font-medium text-[#FF6F3D] text-[10px] uppercase tracking-wider">
                  Astrologer Profile & Details
                </span>
              </div>
              <button className="text-gray-400 p-1 rounded-full hover:bg-gray-50 cursor-pointer">
                {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {detailsOpen && (
              <div className="space-y-4 animate-fade-in pt-1 px-4.5 pb-4.5">
                {/* 2x2 grid of details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100/50 flex-shrink-0">
                      <Clock size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[8px] text-gray-400 font-normal uppercase tracking-wider">Experience</div>
                      <div className="text-xs font-medium text-gray-800 mt-0.5">
                        {astrologer.exp || "8 Years"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-amber-500 border border-gray-100/50 flex-shrink-0">
                      <Star size={14} className="text-amber-500 fill-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[8px] text-gray-400 font-normal uppercase tracking-wider">Rating</div>
                      <div className="text-xs font-medium text-gray-800 mt-0.5">
                        {astrologer.rating || "4.9"} ★
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100/50 flex-shrink-0">
                      <User size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[8px] text-gray-400 font-normal uppercase tracking-wider">Specialization</div>
                      <div className="text-xs font-medium text-gray-800 mt-0.5 leading-relaxed break-words">
                        {astrologer.skill || "Vedic Astrology, Kundli, Tarot Reading"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consultation Price */}
                <div className="bg-[#FFF2EC] border border-[#ffe0d1] rounded-2xl p-3 flex items-center gap-2.5">
                  <Wallet size={14} className="text-[#FF6F3D] flex-shrink-0" />
                  <div>
                    <div className="text-[8px] text-[#FF6F3D]/80 font-normal uppercase tracking-wider">Consultation Price</div>
                    <div className="text-xs font-medium text-gray-800 mt-0.5">{astrologer.price}</div>
                  </div>
                </div>

                {/* Session ID display */}
                <div className="flex justify-between items-center bg-[#FAFAFA] border border-gray-100 rounded-2xl px-3 py-2 text-[10px]">
                  <span className="text-gray-400 font-normal">Session ID</span>
                  <div className="flex items-center gap-1.5 bg-white border border-gray-100 px-2 py-0.5 rounded-lg shadow-2xs">
                    <span className="font-mono text-gray-600 select-all" title={cleanSessionId}>{cleanSessionId || "N/A"}</span>
                    <button 
                      onClick={() => {
                        if (cleanSessionId || summaryData?.sessionCode) {
                          navigator.clipboard.writeText(summaryData?.sessionCode || cleanSessionId);
                          // Removed blocking alert - clipboard operation is silent
                        }
                      }}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 rounded"
                    >
                      <Copy size={10} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages Body */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#FAFAFA]"
        >
          


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
                className={`flex w-full mb-3 ${isAstrologer ? "justify-start" : "justify-end"}`}
              >
                {/* Bubble Container */}
                <div 
                  className={`max-w-[75%] px-4.5 py-2.5 rounded-[22px] shadow-xs text-[14px] leading-relaxed relative ${
                    isAstrologer 
                      ? "bg-white text-gray-800 rounded-tl-none border border-gray-100" 
                      : "bg-[#FF6F3D] text-white rounded-tr-none"
                  }`}
                >
                  {msg.type === "image" ? (
                    <div className="flex flex-col gap-1">
                      <img 
                        src={msg.mediaUrl} 
                        alt="Uploaded media" 
                        className="rounded-lg max-w-full max-h-48 object-cover cursor-pointer"
                        onClick={() => window.open(msg.mediaUrl, "_blank")}
                      />
                      {msg.text && <p className="mt-1">{msg.text}</p>}
                    </div>
                  ) : msg.type === "kundli" ? (
                    <div className={`p-2.5 rounded-xl border ${isAstrologer ? "bg-orange-50/40 border-orange-100/60 text-gray-800" : "bg-orange-600/30 border-orange-400/40 text-white"}`}>
                      <span className={`font-extrabold text-[11px] uppercase tracking-wider block mb-1 ${isAstrologer ? "text-orange-600" : "text-orange-200"}`}>
                        Kundli Shared
                      </span>
                      <p className="text-xs leading-normal">{msg.text}</p>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line break-words">
                      {msg.text}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-[10px] ${isAstrologer ? "text-gray-400" : "text-orange-100/90"}`}>
                      {msg.time}
                    </span>
                    {!isAstrologer && (
                      <CheckCheck size={14} className={msg.status === "read" ? "text-white" : "text-orange-200/60"} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating Scroll to Bottom button - fixed above the send input bar */}
        {showScrollBottom && (
          <button 
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 z-40 bg-white text-[#FF6F3D] hover:bg-gray-50 border border-gray-200 p-2.5 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-all active:scale-90"
            title="Scroll to Bottom"
          >
            <ChevronDown size={18} strokeWidth={3} />
          </button>
        )}

        {/* Input Bar */}
        <form 
          onSubmit={handleSendMessage}
          className="p-4 bg-[#FAFAFA] border-t border-gray-100 flex items-center sticky bottom-0"
        >
          <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-200/60 p-1.5 pl-2 pr-2 flex items-end">
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

            <textarea
              ref={inputRef}
              placeholder="Type a message..."
              value={inputMessage}
              rows={1}
              onFocus={handleInputFocus}
              onChange={(e) => {
                setInputMessage(e.target.value);
                e.target.style.height = "36px";
                const newHeight = Math.min(e.target.scrollHeight, 100);
                e.target.style.height = `${newHeight}px`;
                e.target.style.overflowY = e.target.scrollHeight > 100 ? "auto" : "hidden";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="flex-1 outline-none text-sm bg-transparent placeholder-gray-400 ml-3 resize-none max-h-[100px] py-1.5 text-gray-800"
              style={{ height: "36px", minHeight: "36px", lineHeight: "24px", overflowY: "hidden" }}
            />
            <button
              type="submit"
              className="ml-2 w-9 h-9 rounded-full bg-[#FF6F3D] hover:bg-[#e05e30] flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all shadow-md shadow-orange-500/20 flex-shrink-0"
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
                    onClick={async () => {
                      try {
                        if (sessionId) {
                          await endChat(sessionId);
                        }
                      } catch (err) {
                        console.error("Error cancelling chat request from DOB modal:", err);
                      }
                      localStorage.removeItem("active_chat_session");
                      if (socketRef.current) socketRef.current.disconnect();
                      navigate("/chat");
                    }}
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
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Session ID</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-gray-600 select-all text-[10px]" title={cleanSessionId}>
                      {summaryData?.sessionCode || cleanSessionId || "N/A"}
                    </span>
                    {(summaryData?.sessionCode || cleanSessionId) && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(summaryData?.sessionCode || cleanSessionId);
                        }}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5 rounded active:scale-95"
                        title="Copy Session ID"
                      >
                        <Copy size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Consultant</span>
                  <span className="font-semibold text-gray-800">{astrologer.name}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Chat Duration</span>
                  <span className="font-semibold text-gray-800">
                    {(() => {
                      const secs = summaryData.totalDurationSeconds || (summaryData.totalDurationMinutes * 60) || 0;
                      const mins = Math.floor(secs / 60);
                      const remSecs = secs % 60;
                      if (mins === 0) return `${remSecs} sec`;
                      if (remSecs === 0) return `${mins} min`;
                      return `${mins} min ${remSecs} sec`;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Deduction Rate</span>
                  <span className="font-semibold text-gray-800">{astrologer.price}</span>
                </div>
                <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                  <span>Total Cost</span>
                  <span className="text-[#FF6F3D]">₹{Number(summaryData.totalAmountDeducted || 0).toFixed(2)}</span>
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

     {/* Custom Notification Modal */}
     {customPopup && (
       <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] z-55 flex items-center justify-center p-6">
         <div className="bg-white rounded-[32px] w-full max-w-[320px] p-6 text-center shadow-2xl animate-fade-in flex flex-col items-center">
           <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center shadow-inner mt-2 ${
             customPopup.type === "error" 
               ? "bg-red-50 border-red-100/50" 
               : customPopup.type === "warn"
               ? "bg-amber-50 border-amber-100/50"
               : "bg-orange-50 border-orange-100/50"
           }`}>
             {customPopup.type === "error" ? (
               <span className="text-3xl text-red-500 font-bold leading-none">✕</span>
             ) : customPopup.type === "warn" ? (
               <span className="text-3xl text-amber-500 font-bold leading-none">⚠️</span>
             ) : (
               <span className="text-3xl text-[#FF6F3D] font-bold leading-none">i</span>
             )}
           </div>
           <h3 className="text-lg font-bold text-[#1d2340] mt-5 leading-tight">
             {customPopup.title}
           </h3>
           <p className="text-gray-500 text-xs mt-3 px-2 leading-relaxed">
             {customPopup.message}
           </p>
           <button
             onClick={() => {
               const onConfirm = customPopup.onConfirm;
               setCustomPopup(null);
               if (onConfirm) onConfirm();
             }}
             className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-extrabold text-sm rounded-2xl shadow-lg mt-6 active:scale-95 transition-all cursor-pointer"
           >
             Okay
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
          @keyframes floatUpFade {
            0% {
              opacity: 1;
              transform: translateY(0px) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateY(-28px) scale(0.85);
            }
          }
          .animate-float-up-fade {
            animation: floatUpFade 1.5s forwards ease-out;
          }
        `}</style>

      </div>
    </div>
  );
}
