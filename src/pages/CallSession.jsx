import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import AgoraRTC from "agora-rtc-sdk-ng";
AgoraRTC.setLogLevel(3); // 3 = ERROR level only, silences debug/info spam
import { Mic, MicOff, Video, VideoOff, PhoneOff, Star, AlertTriangle, Clock, Wallet, CheckCircle, Plus, MessageSquare, Send, X, Copy, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../config/backend";
import { getBalance } from "../api/wallet";
import { endVideoSession, rateVideoSession, callRate } from "../api/video";
import { sendMessage as sendChatApi, getHistory as getChatHistoryApi, uploadImage } from "../api/chat";
import { apiFetch } from "../api/client";

export default function CallSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId: routeSessionId } = useParams();
  const { isLoggedIn, triggerLoginModal } = useAuth();

  const stateData = location.state || {};
  const sessionId = stateData.sessionId || routeSessionId;

  const [astrologer, setAstrologer] = useState(() => stateData.astrologer || null);
  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = userObj._id || userObj.id || "";

  // Call states: PENDING, ACTIVE, COMPLETED, REJECTED, MISSED, CANCELLED
  const [sessionStatus, setSessionStatus] = useState("PENDING");
  const [callType, setCallType] = useState(() => String(stateData.callType || "AUDIO").toUpperCase());
  const [channelName, setChannelName] = useState(stateData.channelName || "");
  const [ratePerMinute, setRatePerMinute] = useState(() => astrologer?.priceRaw || 9);

  useEffect(() => {
    if (astrologer?.priceRaw) {
      setRatePerMinute(astrologer.priceRaw);
    }
  }, [astrologer]);
  // Non-blocking in-screen toast (replaces all browser alert() calls)
  const [toastMessage, setToastMessage] = useState(null); // { text, type: 'info'|'warn'|'error' }
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [inCallMessages, setInCallMessages] = useState([
    { id: 1, sender: "astrologer", text: "Hello! How can I help you today?", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
  ]);
  const [inCallInput, setInCallInput] = useState("");
  const [showDetailsDropdown, setShowDetailsDropdown] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);

  const sendInCallMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inCallInput.trim()) return;
    
    const text = inCallInput.trim();
    setInCallInput("");
    
    // Add locally for instant UI update
    const tempId = Math.random().toString();
    setInCallMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: "user",
        text: text,
        image: null,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);

    // Send via socket
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("send_message", {
        sessionId,
        chatId: sessionId,
        roomId: sessionId,
        senderId: userId,
        senderType: "USER",
        text: text,
        messageType: "text"
      });
    }
    // Persist via REST API
    try {
      await sendChatApi({
        sessionId,
        senderId: userId,
        senderType: "USER",
        text: text,
        messageType: "text"
      });
    } catch (err) {
      console.error("Failed to persist message:", err);
    }
  };

  // File Upload Handler
  const handleInCallFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formDataObj = new FormData();
    formDataObj.append("image", file);
    try {
      showToast("Uploading image...", "info", 3000);
      const resData = await uploadImage(formDataObj);
      if (resData && resData.success) {
        const imageUrl = resData.data.imageUrl || resData.imageUrl || resData.data.url;
        
        // Add locally for instant UI update
        const tempId = Math.random().toString();
        setInCallMessages((prev) => [
          ...prev,
          {
            id: tempId,
            sender: "user",
            text: "",
            image: imageUrl,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("send_message", {
            sessionId,
            chatId: sessionId,
            roomId: sessionId,
            senderId: userId,
            senderType: "USER",
            text: "",
            mediaUrl: imageUrl,
            messageType: "image"
          });
        }
        await sendChatApi({
          sessionId,
          senderId: userId,
          senderType: "USER",
          text: "",
          mediaUrl: imageUrl,
          messageType: "image"
        });
      }
    } catch (err) {
      console.error("Image upload error:", err);
      showToast("Failed to upload image.", "error", 4000);
    }
  };

  // Stats & controls
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const elapsedSecondsRef = useRef(0);
  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);
  const [remainingBalance, setRemainingBalance] = useState(() => {
    const saved = localStorage.getItem("wallet_balance");
    return saved ? parseFloat(saved) : 0;
  });
  const [showWarning, setShowWarning] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [peerAudioMuted, setPeerAudioMuted] = useState(false);
  const [peerVideoMuted, setPeerVideoMuted] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  
  // Rating and review state
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submittingRate, setSubmittingRate] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // Hardware settings state
  const [microphones, setMicrophones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [volumeBoost, setVolumeBoost] = useState(100);
  const [showSettings, setShowSettings] = useState(false);
  const [isBillingPaused, setIsBillingPaused] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  // Refs for Agora RTC
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const isInitRef = useRef(false);
  // Ref so socket callbacks always read the LIVE status without stale closures
  const sessionStatusRef = useRef("PENDING");

  // Format second timer to MM:SS
  const formatTime = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Local Timer tick for smooth UI counter
  useEffect(() => {
    if (sessionStatus === "ACTIVE") {
      const start = location.state?.session?.startTime || new Date();
      timerRef.current = setInterval(() => {
        const elapsed = Math.max(0, Math.floor((new Date() - new Date(start)) / 1000));
        setElapsedSeconds(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionStatus]);

  // Play remote video track when remoteUser or container ref becomes available
  useEffect(() => {
    if (sessionStatus === "ACTIVE" && remoteUser && remoteUser.videoTrack && remoteVideoRef.current) {
      console.log("▶️ Playing remote video track in useEffect");
      try {
        remoteUser.videoTrack.play(remoteVideoRef.current);
      } catch (err) {
        console.error("Error playing remote video track in useEffect:", err);
      }
    }
  }, [remoteUser, sessionStatus, hasRemoteVideo, peerVideoMuted]);

  // Play local video track when localVideoTrackRef or container ref becomes available
  useEffect(() => {
    if (sessionStatus === "ACTIVE" && localVideoTrackRef.current && localVideoRef.current) {
      console.log("▶️ Playing local video track in useEffect");
      try {
        localVideoTrackRef.current.play(localVideoRef.current);
      } catch (err) {
        console.error("Error playing local video track in useEffect:", err);
      }
    }
  }, [sessionStatus, isCameraOff]);

  // Keep sessionStatusRef in sync with React state
  useEffect(() => {
    sessionStatusRef.current = sessionStatus;
  }, [sessionStatus]);

  // Load message history on active call session
  useEffect(() => {
    if (sessionStatus === "ACTIVE" && sessionId) {
      getChatHistoryApi(sessionId)
        .then((res) => {
          if (res && res.success && res.data) {
            const formatted = res.data.map((msg) => ({
              id: msg._id,
              sender: String(msg.senderType).toLowerCase() === "user" ? "user" : "astrologer",
              text: msg.text,
              image: msg.mediaUrl || null,
              time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }));
            setInCallMessages(formatted);
          }
        })
        .catch((err) => console.error("Error loading call chat history:", err));
    }
  }, [sessionStatus, sessionId]);

  // Show a non-blocking toast banner that auto-dismisses
  const showToast = (text, type = "info", durationMs = 5000) => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), durationMs);
  };

  // Clean up Agora tracks & client
  const cleanupCall = async () => {
    isInitRef.current = false;
    setRemoteUser(null);
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
    }
    if (clientRef.current) {
      try {
        await clientRef.current.leave();
      } catch (e) {
        console.error("Error leaving Agora channel:", e);
      }
      clientRef.current = null;
    }
  };

  const fetchRealBalance = async () => {
    try {
      const userObj = JSON.parse(localStorage.getItem("user") || "{}");
      const uid = userObj._id || userObj.id || userObj.userId || "";
      const query = uid ? `userId=${uid}` : "";
      const res = await getBalance(query);
      const bal = res?.data?.walletBalance ?? res?.data?.balance ?? 0;
      setRemainingBalance(bal);
      localStorage.setItem("wallet_balance", Number(bal).toFixed(2));
    } catch (err) {
      console.error("Error fetching real balance in CallSession:", err);
    }
  };

  // Socket & Signaling connection
  useEffect(() => {
    if (!isLoggedIn) {
      triggerLoginModal("Call Session", "/call");
      return;
    }

    if (!sessionId) {
      navigate("/call", { replace: true });
      return;
    }

    fetchRealBalance();

    const token = localStorage.getItem("authToken");
    socketRef.current = io(BACKEND_URL, {
      transports: ["polling", "websocket"],
      auth: { token }
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to Calling Socket room:", socket.id);
      socket.emit("register_user", { userId });
      socket.emit("join_call_room", { sessionId });
      socket.emit("join", `call_${sessionId}`);
      socket.emit("join", sessionId);
    });

    // Handle acceptance from astrologer — user only joins call when accepted!
    socket.on("call_accepted", async (data) => {
      console.log("📞 Call accepted by astrologer:", data);
      const appID = data?.agora?.appId || data?.appId || data?.appID;
      const channel = data?.channelName || data?.agora?.channelName || channelName || `call_${sessionId}`;
      const rtcToken = data?.agora?.token || data?.token || data?.rtcToken;
      const callMode = String(data?.session?.callType || data?.callType || callType).toUpperCase();

      setCallType(callMode);
      setChannelName(channel);
      setSessionStatus("ACTIVE");

      // Initialize Agora on acceptance
      await initAgora(appID, channel, rtcToken, callMode);
    });

    // Handle session_active event
    socket.on("session_active", (data) => {
      console.log("⚡ session_active event received:", data);
      setSessionStatus("ACTIVE");
    });

    // Real-time billing timer tick
    socket.on("timer_tick", (data) => {
      if (data) {
        if (data.remainingBalance !== undefined) {
          const safeBal = Number(data.remainingBalance) || 0;
          setRemainingBalance(safeBal);
          localStorage.setItem("wallet_balance", safeBal.toFixed(2));
        }
        if (data.elapsedMinutes !== undefined) {
          const computedSecs = data.elapsedMinutes * 60;
          if (Math.abs(computedSecs - elapsedSeconds) > 60) {
            setElapsedSeconds(computedSecs);
          }
        }
      }
    });

    // Wallet warning — only show if balance is actually below ratePerMinute
    socket.on("wallet_warning", (data) => {
      const bal = Number(data?.remainingBalance ?? 0);
      if (bal < ratePerMinute && bal > 0) {
        setShowWarning(true);
        setRemainingBalance(bal);
        localStorage.setItem("wallet_balance", bal.toFixed(2));
        setTimeout(() => setShowWarning(false), 15000);
      }
    });

    socket.on("billing_paused", () => {
      setIsBillingPaused(true);
    });

    socket.on("billing_resumed", (data) => {
      setIsBillingPaused(false);
      if (data && data.remainingBalance !== undefined) {
        const safeBal = Number(data.remainingBalance) || 0;
        setRemainingBalance(safeBal);
        localStorage.setItem("wallet_balance", safeBal.toFixed(2));
      }
    });

    // Peer media state updates
    const handlePeerMediaState = (data) => {
      console.log("Peer media state changed:", data);
      if (data) {
        if (data.isAudioMuted !== undefined) setPeerAudioMuted(data.isAudioMuted);
        if (data.isVideoMuted !== undefined) setPeerVideoMuted(data.isVideoMuted);
      }
    };
    socket.on("peer_media_state_changed", handlePeerMediaState);
    socket.on("media_state_changed", handlePeerMediaState);

    // Socket message receiver
    socket.on("receive_message", (msg) => {
      const msgSessionId = msg.sessionId || msg.chatId || msg.roomId || msg.session || "";
      if (String(msgSessionId) !== String(sessionId)) return;
      const sender = String(msg.senderType || msg.role || "ASTROLOGER").toLowerCase() === "user" ? "user" : "astrologer";
      
      setInCallMessages((prev) => {
        const exists = prev.some((m) => String(m.id) === String(msg._id) || (m.text === msg.text && m.sender === sender));
        if (exists) return prev;
        return [
          ...prev,
          {
            id: msg._id || Math.random().toString(),
            sender,
            text: msg.text || msg.message || "",
            image: msg.mediaUrl || null,
            time: new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ];
      });
    });

    // Call End event handlers
    const endCallFlow = (data) => {
      console.log("🔴 Call ended from backend/astrologer:", data, "elapsedSeconds:", elapsedSecondsRef.current);
      cleanupCall();
      setSessionStatus("COMPLETED");

      const sessionObj = data?.session || data?.data || data;
      const finalDuration = sessionObj?.totalDurationMinutes || Math.max(1, Math.ceil(elapsedSecondsRef.current / 60));
      const finalCost = sessionObj?.totalAmountDeducted || (finalDuration * ratePerMinute);
      const finalSecs = sessionObj?.totalDurationSeconds || (sessionObj?.duration ? sessionObj.duration * 60 : elapsedSecondsRef.current);

      setSummaryData({
        totalDurationSeconds: finalSecs,
        totalDurationMinutes: finalDuration,
        totalAmountDeducted: finalCost
      });

      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };

    socket.on("call_rejected", (data) => {
      // 🛡️ Guard: ignore stale rejection events that arrive after call is already ACTIVE
      if (sessionStatusRef.current === "ACTIVE" || sessionStatusRef.current === "COMPLETED") {
        console.warn("⚠️ Ignoring stale call_rejected — current status:", sessionStatusRef.current);
        return;
      }
      const reason = data?.reason || "Call was declined by the astrologer.";
      setSessionStatus("REJECTED");
      showToast(reason, "error", 4000);
      setTimeout(() => {
        if (socketRef.current) socketRef.current.disconnect();
        navigate("/call", { replace: true });
      }, 3500);
    });

    socket.on("call_missed", () => {
      if (sessionStatusRef.current === "ACTIVE" || sessionStatusRef.current === "COMPLETED") return;
      setSessionStatus("MISSED");
      showToast("Astrologer did not answer the call.", "warn", 4000);
      setTimeout(() => {
        if (socketRef.current) socketRef.current.disconnect();
        navigate("/call", { replace: true });
      }, 3500);
    });

    socket.on("call_timeout", () => {
      if (sessionStatusRef.current === "ACTIVE" || sessionStatusRef.current === "COMPLETED") return;
      setSessionStatus("MISSED");
      showToast("Call connection timed out.", "warn", 4000);
      setTimeout(() => {
        if (socketRef.current) socketRef.current.disconnect();
        navigate("/call", { replace: true });
      }, 3500);
    });

    socket.on("call_ended", endCallFlow);
    socket.on("call_session_ended", endCallFlow);
    socket.on("end_call", endCallFlow);
    socket.on("session_ended", endCallFlow);
    socket.on("call_ended_insufficient_funds", (data) => {
      showToast("Call ended: insufficient wallet balance.", "warn", 5000);
      endCallFlow(data);
    });

    return () => {
      cleanupCall();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId, isLoggedIn]);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const mics = await AgoraRTC.getMicrophones();
        // Query cameras only if it is a Video Call to prevent audio calls from asking camera permission
        const cams = callType === "VIDEO" ? await AgoraRTC.getCameras() : [];
        const plays = await AgoraRTC.getPlaybackDevices();
        setMicrophones(mics);
        setCameras(cams);
        setSpeakers(plays);
      } catch (err) {
        console.error("Error querying devices:", err);
      }
    };
    if (sessionStatus === "ACTIVE") {
      fetchDevices();
    }
  }, [sessionStatus, callType]);

  // If direct link load, fetch session from backend
  useEffect(() => {
    if (!stateData.sessionId && routeSessionId) {
      apiFetch(`/api/calls/${routeSessionId}`)
        .then(res => {
          const session = res.session || res.data || res;
          if (session) {
            if (session.astrologer) {
              setAstrologer(session.astrologer);
            }
            if (session.callType) {
              setCallType(session.callType);
            }
            if (session.channelName) {
              setChannelName(session.channelName);
            }
            if (session.status === "ACTIVE") {
              setSessionStatus("ACTIVE");
              const appID = session.agora?.appId || session.appId || session.agora?.appID;
              const channel = session.channelName || session.agora?.channelName || `call_${sessionId}`;
              const rtcToken = session.agora?.token || session.token || session.rtcToken;
              initAgora(appID, channel, rtcToken, session.callType || "AUDIO");
            }
          }
        })
        .catch(err => {
          console.error("Failed to load secure call room:", err);
          alert("Could not load secure call room: unauthorized or invalid link");
        });
    }
  }, [routeSessionId]);

  // Agora SDK Integration logic
  const initAgora = async (appId, channelName, rtcToken, mode) => {
    if (sessionId?.startsWith("mock_") || location.state?.isMock) {
      console.log("Mock Call Mode: Bypassing Agora setup.");
      setSessionStatus("ACTIVE");
      return;
    }

    if (isInitRef.current) {
      console.log("Agora connection is already initializing, ignoring duplicate socket event trigger.");
      return;
    }
    isInitRef.current = true;

    try {
      // Clean up previous runs
      if (localAudioTrackRef.current) {
        try { localAudioTrackRef.current.stop(); localAudioTrackRef.current.close(); } catch(e){}
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        try { localVideoTrackRef.current.stop(); localVideoTrackRef.current.close(); } catch(e){}
        localVideoTrackRef.current = null;
      }
      if (clientRef.current) {
        try { await clientRef.current.leave(); } catch (e) {}
        clientRef.current = null;
      }

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      // Subscribe to remote streams
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        console.log("Subscribed to astrologer track:", user.uid, mediaType);
        
        if (mediaType === "video") {
          setRemoteUser(user);
          setHasRemoteVideo(true);
          if (remoteVideoRef.current) {
            user.videoTrack.play(remoteVideoRef.current);
          }
        }
        if (mediaType === "audio") {
          user.audioTrack.play();
        }
      });

      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "video") {
          setHasRemoteVideo(false);
          setRemoteUser(null);
        }
      });

      client.on("user-left", (user) => {
        console.log("Astrologer left the channel:", user.uid);
        setHasRemoteVideo(false);
        setRemoteUser(null);
        handleEndCall();
      });

      // Join the channel — pass null for mock/empty tokens (enables Agora App-ID-only test mode)
      const resolvedToken = (rtcToken && !String(rtcToken).startsWith("mock_")) ? rtcToken : null;
      await client.join(appId, channelName, resolvedToken, null);

      // Create local tracks and publish
      if (mode === "VIDEO") {
        try {
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            {},
            {
              facingMode: "user"
            }
          );
          localAudioTrackRef.current = audioTrack;
          localVideoTrackRef.current = videoTrack;

          if (localVideoRef.current) {
            videoTrack.play(localVideoRef.current);
          }

          await client.publish([audioTrack, videoTrack]);
        } catch (videoErr) {
          console.warn("⚠️ Camera/Mic error on video mode, falling back to audio only:", videoErr);
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          localAudioTrackRef.current = audioTrack;
          await client.publish([audioTrack]);
        }
      } else {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = audioTrack;

        await client.publish([audioTrack]);
      }

      setSessionStatus("ACTIVE");
    } catch (err) {
      isInitRef.current = false;
      console.error("Agora configuration failed:", err);
      if (err.message && err.message.includes("PERMISSION_DENIED")) {
        alert("Please allow Camera and Microphone permissions in your browser settings to connect the call.");
      } else {
        alert("Could not start audio/video streaming: " + err.message);
      }
      handleEndCall();
    }
  };

  // Mute local microphone
  const toggleMute = async () => {
    if (localAudioTrackRef.current) {
      try {
        const nextState = !isMuted;
        await localAudioTrackRef.current.setEnabled(!nextState);
        setIsMuted(nextState);
        socketRef.current?.emit("media_state_change", {
          sessionId,
          isAudioMuted: nextState,
          isVideoMuted: isCameraOff
        });
      } catch (err) {
        console.error("Mute toggle failed:", err);
      }
    }
  };

  // Disable/Enable local webcam
  const toggleCamera = async () => {
    if (localVideoTrackRef.current) {
      try {
        const nextState = !isCameraOff;
        await localVideoTrackRef.current.setEnabled(!nextState);
        setIsCameraOff(nextState);
        socketRef.current?.emit("media_state_change", {
          sessionId,
          isAudioMuted: isMuted,
          isVideoMuted: nextState
        });
      } catch (err) {
        console.error("Camera toggle failed:", err);
      }
    }
  };

  // Terminate call manually
  const handleEndCall = async () => {
    if (sessionId?.startsWith("mock_") || location.state?.isMock) {
      cleanupCall();
      setSessionStatus("COMPLETED");
      setSummaryData({
        totalDurationSeconds: elapsedSeconds,
        totalDurationMinutes: Math.max(1, Math.ceil(elapsedSeconds / 60)),
        totalAmountDeducted: Math.max(1, Math.ceil(elapsedSeconds / 60)) * ratePerMinute
      });
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      return;
    }

    try {
      // Emit socket event to end call session
      socketRef.current?.emit("end_call_session", { sessionId });

      const resData = await endVideoSession(sessionId);
      cleanupCall();
      setSessionStatus("COMPLETED");

      const sessionObj = resData.data || {};
      const finalSeconds = sessionObj.totalDurationSeconds || elapsedSeconds;
      const finalCost = sessionObj.totalAmountDeducted
        ? parseFloat(sessionObj.totalAmountDeducted.toFixed(2))
        : parseFloat(((finalSeconds / 60) * ratePerMinute).toFixed(2));
      setSummaryData({
        totalDurationSeconds: finalSeconds,
        totalDurationMinutes: sessionObj.totalDurationMinutes || Math.ceil(finalSeconds / 60),
        totalAmountDeducted: finalCost,
        sessionCode: sessionObj.sessionCode || null
      });

      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    } catch (err) {
      console.error("Error ending call:", err);
      // Fallback local cleanup
      cleanupCall();
      setSessionStatus("COMPLETED");
      setSummaryData({
        totalDurationSeconds: elapsedSeconds,
        totalDurationMinutes: Math.max(1, Math.ceil(elapsedSeconds / 60)),
        totalAmountDeducted: Math.max(1, Math.ceil(elapsedSeconds / 60)) * ratePerMinute
      });
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    }
  };

  const handleMicChange = async (e) => {
    const deviceId = e.target.value;
    setSelectedMic(deviceId);
    if (localAudioTrackRef.current) {
      await localAudioTrackRef.current.setDevice(deviceId);
    }
  };

  const handleCameraChange = async (e) => {
    const deviceId = e.target.value;
    setSelectedCamera(deviceId);
    if (localVideoTrackRef.current) {
      await localVideoTrackRef.current.setDevice(deviceId);
    }
  };

  const handleSpeakerChange = async (e) => {
    const deviceId = e.target.value;
    setSelectedSpeaker(deviceId);
    if (remoteUser && remoteUser.audioTrack) {
      await remoteUser.audioTrack.setPlaybackDevice(deviceId);
    }
  };

  const handleVolumeBoost = (boostLevel) => {
    setVolumeBoost(boostLevel);
    if (remoteUser && remoteUser.audioTrack) {
      remoteUser.audioTrack.setVolume(boostLevel);
    }
  };

  const handleToggleSpeaker = () => {
    const nextState = !isSpeakerOn;
    setIsSpeakerOn(nextState);
    const boostLevel = nextState ? 300 : 100; // 300% for Speakerphone, 100% for Normal Earpiece
    setVolumeBoost(boostLevel);
    if (remoteUser && remoteUser.audioTrack) {
      remoteUser.audioTrack.setVolume(boostLevel);
    }
  };

  const handleRechargeWallet = () => {
    // Emit pause to the backend instantly so the user is not billed during payment
    socketRef.current?.emit("pause_session_billing", { sessionId });
    
    // Open recharge gateway in new tab
    window.open("/wallet?recharge=true", "_blank");
  };

  const handleResumeCallBilling = () => {
    socketRef.current?.emit("resume_session_billing", { sessionId });
  };

  // Rate call session
  const handleRateSession = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert("Please select a rating star to submit your review.");
      return;
    }
    setSubmittingRate(true);
    try {
      await rateVideoSession({ sessionId, rating, review });
      // No alert — navigate away cleanly
    } catch (err) {
      console.error("Rating submission error:", err);
    } finally {
      setSubmittingRate(false);
      navigate("/call");
    }
  };

  // --- RENDER VIEWS ---

  // 1. PENDING (Ringing Outgoing) View
  if (sessionStatus === "PENDING" || sessionStatus === "REJECTED" || sessionStatus === "MISSED") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#111827] to-[#1F2937] flex justify-center text-white">
        {/* ✅ Non-blocking in-screen notification banner — replaces all browser alert() */}
        {toastMessage && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[90vw] px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold flex items-start gap-2.5 animate-fade-in ${
              toastMessage.type === "error"
                ? "bg-red-600"
                : toastMessage.type === "warn"
                ? "bg-amber-500"
                : "bg-gray-800"
            }`}
          >
            <span className="text-lg leading-none flex-shrink-0">
              {toastMessage.type === "error" ? "❌" : toastMessage.type === "warn" ? "⚠️" : "ℹ️"}
            </span>
            <span>{toastMessage.text}</span>
          </div>
        )}
        <div className="w-full max-w-[430px] flex flex-col justify-between items-center p-8 relative">
          
          {/* Header */}
          <div className="text-center mt-12 space-y-2">
            <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-orange-500/20">
              Outgoing Call
            </span>
            <h2 className="text-2xl font-bold mt-4">{astrologer?.name || "Astrologer"}</h2>
            <p className="text-gray-400 text-sm animate-pulse">Calling...</p>
          </div>

          {/* Visual Pulsing Avatar Container */}
          <div className="relative my-auto flex items-center justify-center">
            <div className="absolute w-48 h-48 bg-orange-500/10 rounded-full animate-ping duration-1000"></div>
            <div className="absolute w-40 h-40 bg-orange-500/20 rounded-full animate-pulse duration-700"></div>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-orange-500/40 relative z-10 shadow-2xl">
              <img
                src={astrologer?.image || "https://randomuser.me/api/portraits/women/65.jpg"}
                alt={astrologer?.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Cancel button */}
          <div className="mb-12">
            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg hover:shadow-red-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <PhoneOff size={24} className="text-white" />
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">Cancel Call</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE Calling Screen View
  if (sessionStatus === "ACTIVE") {
    const isVideo = callType === "VIDEO";

    return (
      <div className="h-screen h-[100dvh] w-full max-w-[430px] bg-slate-950 flex flex-col justify-between items-center relative overflow-hidden text-white mx-auto shadow-2xl">
        
        {isBillingPaused && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-[60] flex flex-col items-center justify-center p-6 text-center text-white pointer-events-auto">
            <div className="w-16 h-16 bg-[#FF6F3D]/10 text-[#FF6F3D] rounded-full flex items-center justify-center mb-4 border border-[#FF6F3D]/25 animate-pulse">
              <Clock size={32} />
            </div>
            <h3 className="text-xl font-extrabold text-white">Call Session Paused</h3>
            <p className="text-gray-400 text-xs mt-2 max-w-[280px]">
              Billing has been paused because you are recharging your wallet. 
              Please resume the call once your payment is complete.
            </p>
            
            <button
              onClick={handleResumeCallBilling}
              className="mt-6 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              Resume Call & Billing
            </button>
          </div>
        )}
        
        {/* ✅ Non-blocking in-screen notification banner */}
        {toastMessage && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-[90vw] px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold flex items-start gap-2.5 animate-fade-in ${
              toastMessage.type === "error"
                ? "bg-red-600"
                : toastMessage.type === "warn"
                ? "bg-amber-500"
                : "bg-gray-800"
            }`}
          >
            <span className="text-lg leading-none flex-shrink-0">
              {toastMessage.type === "error" ? "❌" : toastMessage.type === "warn" ? "⚠️" : "ℹ️"}
            </span>
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Low Balance Warning Banner */}
        {showWarning && (
          <div className="absolute top-20 left-4 right-4 z-50 bg-[#FFF2EC] border border-[#ffe0d1] rounded-2xl p-3 flex items-center justify-between shadow-2xl animate-fade-in pointer-events-auto text-gray-800">
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
              onClick={handleRechargeWallet}
              className="bg-[#FF6F3D] hover:bg-[#e05e30] text-white text-[10px] font-black px-3 py-1.5 rounded-xl active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-0.5"
            >
              <Plus size={8} strokeWidth={3} /> Add Money
            </button>
          </div>
        )}

        {/* Top Header Overlay Pill */}
        <div className="absolute top-5 left-0 right-0 z-30 flex flex-col items-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-xl pl-4 pr-3 py-1.5 rounded-full border border-white/15 flex items-center gap-3 shadow-2xl">
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-orange-400 animate-pulse" />
              <span className="font-mono text-sm font-bold text-white tracking-wider">{formatTime(elapsedSeconds)}</span>
            </div>
            <span className="text-white/20 text-xs">|</span>
            <span className="text-xs font-bold text-orange-400">₹{ratePerMinute}/min</span>
            {remainingBalance !== null && (
              <>
                <span className="text-white/20 text-xs">|</span>
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2.5 py-0.5 text-emerald-400 shadow-sm whitespace-nowrap">
                  <span className="text-[10px] font-black uppercase tracking-wide">
                    Bal: ₹{remainingBalance.toFixed(2)}
                  </span>
                  <button
                    onClick={handleRechargeWallet}
                    className="w-4 h-4 bg-[#FF6F3D] hover:bg-[#e05e30] text-white flex items-center justify-center rounded-full cursor-pointer shadow-xs transition-transform hover:scale-105 active:scale-95 flex-shrink-0"
                  >
                    <Plus size={9} strokeWidth={3} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Dropdown Details Option Toggle Button */}
          <button
            onClick={() => setShowDetailsDropdown(!showDetailsDropdown)}
            className="pointer-events-auto bg-slate-900/75 hover:bg-slate-900/90 backdrop-blur-xl mt-3 px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 shadow-lg text-[10px] font-bold text-gray-200 cursor-pointer active:scale-95 transition-all"
          >
            <span>Astrologer Details</span>
            <svg 
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${showDetailsDropdown ? "rotate-180" : ""}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expandable Details Dropdown Card */}
          {showDetailsDropdown && (
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-xl rounded-2xl border border-white/10 p-4 mt-2.5 w-full max-w-[320px] shadow-2xl animate-slide-down flex flex-col gap-3 text-left">
              {/* Astrologer Name */}
              <div className="flex justify-between items-center text-[10px] text-gray-400 border-b border-white/5 pb-2">
                <span>Astrologer:</span>
                <span className="font-bold text-white uppercase tracking-wide">{astrologer?.name || "Astrologer"}</span>
              </div>

              {/* Deduction Rate */}
              <div className="flex justify-between items-center text-[10px] text-gray-400 border-b border-white/5 pb-2">
                <span>Rate per min:</span>
                <span className="font-bold text-orange-400">₹{ratePerMinute}/min</span>
              </div>

              {/* Session ID */}
              <div className="flex justify-between items-center text-[10px] text-gray-400 border-b border-white/5 pb-2">
                <span>Session ID:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-white select-all">{sessionId || "N/A"}</span>
                  {sessionId && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(sessionId);
                      }}
                      className="text-gray-400 hover:text-white cursor-pointer p-0.5 rounded active:scale-95 transition-all"
                      title="Copy Session ID"
                    >
                      <Copy size={10} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Astrologer Details Grid */}
              <div className="flex items-center justify-between gap-2 text-center pt-0.5">
                {/* Skills */}
                <div className="flex-1 min-w-0">
                  <span className="text-[7.5px] font-black text-slate-500 tracking-wider uppercase">Skills</span>
                  <p className="text-[10px] font-extrabold text-white mt-1 leading-tight break-words" title={astrologer?.skills || astrologer?.skill}>
                    {astrologer?.skills || astrologer?.skill || "Vedic"}
                  </p>
                </div>
                
                <div className="w-[1px] bg-white/10 h-6 flex-shrink-0"></div>
                
                {/* Experience */}
                <div className="flex-1 min-w-0">
                  <span className="text-[7.5px] font-black text-slate-500 tracking-wider uppercase">Experience</span>
                  <p className="text-[10px] font-extrabold text-white mt-1 leading-tight break-words">
                    {astrologer?.experience || astrologer?.exp || "5 Yrs"}
                  </p>
                </div>
                
                <div className="w-[1px] bg-white/10 h-6 flex-shrink-0"></div>
                
                {/* Rating */}
                <div className="flex-1 min-w-0">
                  <span className="text-[7.5px] font-black text-slate-500 tracking-wider uppercase">Rating</span>
                  <p className="text-[10px] font-extrabold text-white mt-1 flex items-center justify-center gap-0.5 leading-tight break-words">
                    <Star size={9} className="fill-amber-400 text-amber-400" />
                    <span>{astrologer?.rating || "4.8"}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Peer muted status badges */}
          {(peerAudioMuted || peerVideoMuted) && (
            <div className="pointer-events-auto flex items-center gap-2 mt-3">
              {peerAudioMuted && (
                <div className="bg-rose-500/80 backdrop-blur-md px-3 py-1 rounded-full border border-rose-500/30 flex items-center gap-1.5 text-[11px] font-bold text-white shadow-md">
                  <MicOff size={11} />
                  <span>Astro Muted</span>
                </div>
              )}
              {peerVideoMuted && isVideo && (
                <div className="bg-rose-500/80 backdrop-blur-md px-3 py-1 rounded-full border border-rose-500/30 flex items-center gap-1.5 text-[11px] font-bold text-white shadow-md">
                  <VideoOff size={11} />
                  <span>Camera Off</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Full View Area */}
        {isVideo ? (
          <div className="absolute inset-0 w-full h-full bg-slate-950 z-0 overflow-hidden">
            
            {/* Remote Astrologer Video Stream Container */}
            <div 
              onClick={() => { if (isSwapped) setIsSwapped(false); }}
              className={`${isSwapped 
                ? "absolute bottom-24 right-4 w-28 h-40 bg-slate-900 rounded-2xl overflow-hidden border-2 border-white/20 z-30 shadow-2xl transition-all cursor-pointer" 
                : "absolute inset-0 w-full h-full bg-slate-950 z-0 overflow-hidden"
              } flex items-center justify-center`}
            >
              <div 
                ref={remoteVideoRef} 
                className="w-full h-full relative overflow-hidden flex items-center justify-center [&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full [&>div]:!h-full [&>div]:!w-full"
              />
              {(!hasRemoteVideo || peerVideoMuted) && (
                <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-900 z-10 text-center px-2">
                  <div className="relative mb-2">
                    <div className="absolute -inset-2 bg-orange-500/20 rounded-full blur-lg animate-pulse"></div>
                    <img
                      src={astrologer?.image || "https://randomuser.me/api/portraits/women/65.jpg"}
                      alt={astrologer?.name}
                      className={`${isSwapped ? "w-12 h-12" : "w-28 h-28"} rounded-full border border-orange-500/60 object-cover shadow-2xl relative z-10 transition-all`}
                    />
                  </div>
                  {!isSwapped && (
                    <>
                      <h3 className="text-xl font-bold text-white mb-1">{astrologer?.name || "Astrologer"}</h3>
                      <p className="text-xs text-orange-400 font-medium mb-3">
                        {peerVideoMuted ? "Astrologer's camera is turned off" : "Connecting video stream..."}
                      </p>
                      
                      {/* Astrologer Extra Details */}
                      <div className="pt-3 border-t border-white/10 space-y-1 w-full max-w-[200px] mx-auto">
                        {(astrologer?.skills || astrologer?.skill || astrologer?.specialization) && (
                          <p className="text-xs text-gray-300 font-medium truncate">
                            {astrologer?.skills || astrologer?.skill || (Array.isArray(astrologer?.specialization) ? astrologer?.specialization.join(", ") : astrologer?.specialization)}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-center gap-3 text-xs text-gray-400 pt-0.5">
                          {(astrologer?.experience || astrologer?.exp) && (
                            <span>Exp: {astrologer?.experience || astrologer?.exp}</span>
                          )}
                          {astrologer?.rating && (
                            <>
                              <span className="text-white/20">•</span>
                              <span className="flex items-center gap-0.5">
                                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                {astrologer?.rating}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {isSwapped && (
                    <span className="text-[8px] font-bold text-orange-400">Off</span>
                  )}
                </div>
              )}

              {/* Astro Label Badge (Only shown when swapped into PiP) */}
              {isSwapped && (
                <div className="absolute bottom-2 left-2 bg-slate-950/70 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] font-black text-white z-20 border border-white/10 uppercase tracking-wider">
                  Astro
                </div>
              )}
            </div>

            {/* Local Video Tile Container */}
            <div 
              onClick={() => { if (!isSwapped) setIsSwapped(true); }}
              className={`${isSwapped 
                ? "absolute inset-0 w-full h-full bg-slate-950 z-0 overflow-hidden" 
                : "absolute bottom-24 right-4 w-28 h-40 bg-slate-900 rounded-2xl overflow-hidden border-2 border-white/20 z-30 shadow-2xl transition-all cursor-pointer"
              }`}
            >
              <div 
                ref={localVideoRef} 
                className="w-full h-full relative overflow-hidden [&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full [&>video]:!transform [&>video]:!scale-x-[-1] [&>div]:!h-full [&>div]:!w-full"
              />
              
              {/* "You" Label Badge */}
              <div className="absolute bottom-2 left-2 bg-slate-950/70 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] font-black text-white z-20 border border-white/10 uppercase tracking-wider">
                You
              </div>

              {isCameraOff && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-1.5 text-gray-400 z-10">
                  <VideoOff size={isSwapped ? 32 : 20} />
                  <span className={`${isSwapped ? "text-xs" : "text-[10px]"} font-bold`}>Cam Off</span>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Audio Call Mode View */
          <div className="flex flex-col items-center justify-center my-auto space-y-6 z-10 mt-32">
            <div className="relative flex flex-col items-center">
              {/* Pulsating back glow */}
              <div className="absolute w-44 h-44 bg-gradient-to-tr from-orange-500/10 to-[#FF6F3D]/10 rounded-full blur-2xl animate-pulse"></div>
              
              {/* Outer Glowing Border Ring */}
              <div className="relative w-40 h-40 bg-gradient-to-tr from-orange-500 to-[#FF6F3D] rounded-full p-1 flex items-center justify-center shadow-[0_0_50px_rgba(255,111,61,0.25)]">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-950">
                  <img
                    src={astrologer?.image || "https://randomuser.me/api/portraits/women/65.jpg"}
                    alt={astrologer?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="text-center space-y-2.5 max-w-xs px-4">
              <h3 className="text-3xl font-extrabold tracking-tight text-white capitalize">{astrologer?.name || "Astrologer"}</h3>
              
              <div className="flex justify-center mt-1">
                <p className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 justify-center shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Active Voice Call
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Bottom Control Action Bar Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pb-5 pt-12 px-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
          <div className="flex items-center justify-center gap-6">
            
            {/* 1. Mic Toggle */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${
                isMuted 
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 backdrop-blur-md shadow-rose-500/5" 
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md shadow-black/20"
              }`}
              title="Toggle Mic"
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* 2. Camera Toggle */}
            {isVideo && (
              <button
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${
                  isCameraOff 
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 backdrop-blur-md shadow-rose-500/5" 
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md shadow-black/20"
                }`}
                title="Toggle Camera"
              >
                {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

            {/* 3. Chat/Message Toggle */}
            <button
              onClick={() => setShowInCallChat(true)}
              className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md shadow-black/20 flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg active:scale-95"
              title="Open Chat"
            >
              <MessageSquare size={22} />
            </button>

            {/* Replace Settings button with simple Speaker toggle */}
            <button
              onClick={handleToggleSpeaker}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl cursor-pointer border ${
                isSpeakerOn 
                  ? "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/30" 
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              }`}
              title={isSpeakerOn ? "Turn Speaker Off" : "Turn Speaker On"}
            >
              <Volume2 size={22} />
            </button>

            {/* 4. End Call Button */}
            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-[#FF3B30] hover:bg-red-600 text-white flex items-center justify-center cursor-pointer shadow-lg active:scale-95 border border-red-400/20 shadow-red-500/10"
              title="End Call"
            >
              <PhoneOff size={24} />
            </button>

          </div>
        </div>

        {/* In-Call Chat Overlay Drawer (Matches second screenshot UI) */}
        {showInCallChat && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] z-50 flex flex-col justify-end animate-fade-in pointer-events-auto">
            <div className="w-full bg-[#111827] rounded-t-[28px] border-t border-white/10 flex flex-col h-[70vh] shadow-2xl overflow-hidden relative text-left">
              
              {/* Header */}
              <div className="bg-[#1F2937] border-b border-white/10 px-4 py-3.5 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-extrabold text-sm text-white tracking-wide">
                    Chat with {astrologer?.name || "Astrologer"}
                  </span>
                </div>
                <button
                  onClick={() => setShowInCallChat(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
                <div className="flex justify-center my-1">
                  <span className="bg-white/5 text-[10px] text-gray-400 px-3 py-0.5 rounded-full font-semibold border border-white/5">
                    In-Call Message Session
                  </span>
                </div>
                {inCallMessages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed relative ${
                        isUser 
                          ? "bg-[#FF6F3D] text-white rounded-tr-none" 
                          : "bg-white/10 text-slate-100 rounded-tl-none border border-white/5"
                      }`}>
                        {msg.image ? (
                          <div className="rounded-lg overflow-hidden max-w-[200px] mb-1">
                            <img src={msg.image} alt="Uploaded" className="w-full h-auto object-cover max-h-48" />
                          </div>
                        ) : (
                          <p className="whitespace-pre-line break-words font-medium">{msg.text}</p>
                        )}
                        <span className={`text-[8.5px] block text-right mt-1 opacity-70 ${isUser ? "text-orange-100" : "text-slate-400"}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Footer */}
              <form 
                onSubmit={sendInCallMessage}
                className="p-4 bg-[#1F2937] border-t border-white/5 flex items-center gap-2 flex-shrink-0"
              >
                <input
                  type="file"
                  id="in-call-file-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleInCallFileUpload}
                />
                <label 
                  htmlFor="in-call-file-upload"
                  className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors active:scale-95 border border-white/10 flex-shrink-0"
                  title="Upload Image"
                >
                  <Plus size={18} />
                </label>
                <input
                  type="text"
                  value={inCallInput}
                  onChange={(e) => setInCallInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-gray-400 outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  className="w-11 h-11 rounded-full bg-[#FF6F3D] hover:bg-[#e05e30] flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all shadow-md shadow-orange-500/20 flex-shrink-0"
                >
                  <Send size={15} className="fill-white translate-x-[1px]" />
                </button>
              </form>

            </div>
          </div>
        )}

      </div>
    );
  }

  // 3. COMPLETED Call summary and rating screen
  if (sessionStatus === "COMPLETED") {
    return (
      <div className="min-h-screen bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-gray-900">
        <div className="bg-white rounded-[32px] w-full max-w-[340px] p-6 text-center shadow-2xl animate-fade-in flex flex-col items-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4">
            <CheckCircle size={32} />
          </div>
          <h4 className="text-xl font-bold text-[#1d2340]">Call Session Summary</h4>
          <p className="text-gray-400 text-xs mt-1">Thank you for consulting {astrologer?.name || "us"}!</p>
          
          <div className="w-full bg-[#FAFAFA] rounded-2xl p-4 space-y-3 mt-5 border border-gray-100 text-left">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Session ID</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-gray-600 select-all text-[10px]" title={sessionId}>
                  {summaryData?.sessionCode || sessionId || "N/A"}
                </span>
                {(summaryData?.sessionCode || sessionId) && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(summaryData?.sessionCode || sessionId);
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
              <span className="font-semibold text-gray-800">{astrologer?.name || "Astrologer"}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Call Duration</span>
              <span className="font-semibold text-gray-800">
                {(() => {
                  const secs = summaryData?.totalDurationSeconds || (summaryData?.totalDurationMinutes * 60) || 0;
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
              <span className="font-semibold text-gray-800">₹{ratePerMinute}/min</span>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
              <span>Total Cost</span>
              <span className="text-[#FF6F3D]">₹{Number(summaryData?.totalAmountDeducted || 0).toFixed(2)}</span>
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
              className="w-full mt-3.5 p-3 border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-400 resize-none h-16 bg-gray-50/50 text-gray-800"
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
              navigate("/call");
            }}
            className="mt-3 text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Skip Rating & Back to Calls
          </button>
        </div>
      </div>
    );
  }

  // Fallback for other ending statuses (missed, rejected, cancelled, etc.)
  return null;
}
