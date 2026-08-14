import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import AgoraRTC from "agora-rtc-sdk-ng";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Star, AlertTriangle, Clock, Wallet, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function CallSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, triggerLoginModal } = useAuth();

  // Retrieve params passed via route state
  const { astrologer, callType: initialCallType, sessionId, channelName: initialChannelName } = location.state || {};

  const userObj = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = userObj._id || userObj.id || "";

  // Call states: PENDING, ACTIVE, COMPLETED, REJECTED, MISSED, CANCELLED
  const [sessionStatus, setSessionStatus] = useState("PENDING");
  const [callType, setCallType] = useState(() => String(initialCallType || "AUDIO").toUpperCase());
  const [channelName, setChannelName] = useState(initialChannelName || "");
  const [ratePerMinute, setRatePerMinute] = useState(astrologer?.priceRaw || 0);

  // Stats & controls
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
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
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [submittingRate, setSubmittingRate] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // Refs for Agora RTC
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const timerRef = useRef(null);
  const isInitRef = useRef(false);

  // Format second timer to MM:SS
  const formatTime = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Local Timer tick for smooth UI counter
  useEffect(() => {
    if (sessionStatus === "ACTIVE") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
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
      const token = localStorage.getItem("authToken");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const url = userId
        ? `${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/wallet/balance?userId=${userId}`
        : `${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/wallet/balance`;
        
      const res = await fetch(url, { headers });
      const resData = await res.json();
      if (resData.success && resData.data !== undefined) {
        const bal = resData.data.walletBalance ?? resData.data.balance ?? 0;
        setRemainingBalance(bal);
        localStorage.setItem("wallet_balance", bal.toFixed(2));
      }
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
      alert("Invalid Call Session. Redirecting to call list.");
      navigate("/call");
      return;
    }

    fetchRealBalance();

    const token = localStorage.getItem("authToken");
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com", {
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

    // Peer media state updates
    socket.on("peer_media_state_changed", (data) => {
      console.log("Peer media state changed:", data);
      if (data) {
        if (data.isAudioMuted !== undefined) setPeerAudioMuted(data.isAudioMuted);
        if (data.isVideoMuted !== undefined) setPeerVideoMuted(data.isVideoMuted);
      }
    });

    // Call End event handlers
    const endCallFlow = (data) => {
      console.log("🔴 Call ended from backend/astrologer:", data);
      cleanupCall();
      setSessionStatus("COMPLETED");

      const sessionObj = data?.session || data?.data || data;
      const finalDuration = sessionObj?.totalDurationMinutes || Math.max(1, Math.ceil(elapsedSeconds / 60));
      const finalCost = sessionObj?.totalAmountDeducted || (finalDuration * ratePerMinute);

      setSummaryData({
        totalDurationMinutes: finalDuration,
        totalAmountDeducted: finalCost
      });

      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };

    socket.on("call_rejected", (data) => {
      alert(data?.reason ? `Call rejected: ${data.reason}` : "Call was declined by the astrologer.");
      if (socketRef.current) socketRef.current.disconnect();
      navigate("/call");
    });

    socket.on("call_missed", () => {
      alert("Call was not answered.");
      if (socketRef.current) socketRef.current.disconnect();
      navigate("/call");
    });

    socket.on("call_timeout", () => {
      alert("Call connection timed out.");
      if (socketRef.current) socketRef.current.disconnect();
      navigate("/call");
    });

    socket.on("call_ended", endCallFlow);
    socket.on("call_session_ended", endCallFlow);
    socket.on("end_call", endCallFlow);
    socket.on("session_ended", endCallFlow);
    socket.on("call_ended_insufficient_funds", (data) => {
      alert("Call ended due to insufficient wallet balance.");
      endCallFlow(data);
    });

    return () => {
      cleanupCall();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId, isLoggedIn]);

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
          const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
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

      const token = localStorage.getItem("authToken");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/video-session/end/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });

      const resData = await response.json();
      cleanupCall();
      setSessionStatus("COMPLETED");

      const sessionObj = resData.data || {};
      const finalDuration = sessionObj.totalDurationMinutes || Math.max(1, Math.ceil(elapsedSeconds / 60));
      const finalCost = sessionObj.totalAmountDeducted || (finalDuration * ratePerMinute);

      setSummaryData({
        totalDurationMinutes: finalDuration,
        totalAmountDeducted: finalCost
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
        totalDurationMinutes: Math.max(1, Math.ceil(elapsedSeconds / 60)),
        totalAmountDeducted: Math.max(1, Math.ceil(elapsedSeconds / 60)) * ratePerMinute
      });
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    }
  };

  // Rate call session
  const handleRateSession = async (e) => {
    e.preventDefault();
    setSubmittingRate(true);
    try {
      const token = localStorage.getItem("authToken");
      let response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/video-session/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sessionId,
          rating,
          review
        })
      });

      if (!response.ok) {
        response = await fetch(`${import.meta.env.VITE_BACKEND_URL || "https://kalpjoytish-backend.onrender.com"}/api/call/rate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            sessionId,
            rating,
            review
          })
        });
      }
      alert("Thank you for your valuable feedback!");
    } catch (err) {
      console.error("Rating submission error:", err);
    } finally {
      setSubmittingRate(false);
      navigate("/call");
    }
  };

  // --- RENDER VIEWS ---

  // 1. PENDING (Ringing Outgoing) View
  if (sessionStatus === "PENDING") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#111827] to-[#1F2937] flex justify-center text-white">
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
        
        {/* Low Balance Warning Banner */}
        {showWarning && (
          <div className="absolute top-4 left-4 right-4 z-50 bg-amber-500 text-black px-4 py-3 rounded-2xl flex items-center justify-between gap-2 shadow-xl border border-amber-300">
            <div className="flex items-center gap-2 flex-1">
              <AlertTriangle size={18} className="flex-shrink-0 text-black" />
              <p className="text-xs font-bold leading-tight">
                Low balance! {remainingBalance !== null ? `₹${remainingBalance.toFixed(2)} left.` : ""} Kindly recharge to enjoy more.
              </p>
            </div>
            <button
              onClick={() => navigate("/deposit")}
              className="flex-shrink-0 bg-black/20 hover:bg-black/30 text-black text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              Recharge
            </button>
          </div>
        )}

        {/* Top Header Overlay Pill */}
        <div className="absolute top-5 left-0 right-0 z-30 flex flex-col items-center px-4 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-xl px-4 py-2 rounded-full border border-white/15 flex items-center gap-3 shadow-2xl">
            <Clock size={14} className="text-orange-400 animate-pulse" />
            <span className="font-mono text-sm font-bold text-white tracking-wider">{formatTime(elapsedSeconds)}</span>
            <span className="text-white/30 text-xs">|</span>
            <span className="text-xs font-bold text-orange-400">₹{ratePerMinute}/min</span>
            {remainingBalance !== null && (
              <>
                <span className="text-white/30 text-xs">|</span>
                <span className={`text-xs font-extrabold ${remainingBalance < ratePerMinute * 2 ? "text-rose-400" : "text-emerald-400"}`}>
                  Bal: ₹{remainingBalance.toFixed(0)}
                </span>
              </>
            )}
          </div>

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
            
            {/* Fullscreen Remote Astrologer Video Stream */}
            <div 
              ref={remoteVideoRef} 
              className="w-full h-full relative overflow-hidden flex items-center justify-center [&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full [&>div]:!h-full [&>div]:!w-full"
            >
              {(!hasRemoteVideo || peerVideoMuted) && (
                <div className="absolute inset-0 flex flex-col justify-center items-center bg-slate-900 z-10 text-center px-4">
                  <div className="relative mb-3">
                    <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-xl animate-pulse"></div>
                    <img
                      src={astrologer?.image || "https://randomuser.me/api/portraits/women/65.jpg"}
                      alt={astrologer?.name}
                      className="w-28 h-28 rounded-full border-2 border-orange-500/60 object-cover shadow-2xl relative z-10"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{astrologer?.name || "Astrologer"}</h3>
                  <p className="text-xs text-gray-400 font-medium">
                    {peerVideoMuted ? "Astrologer's camera is turned off" : "Connecting video stream..."}
                  </p>
                </div>
              )}
            </div>

            {/* Picture-in-Picture Local Video Tile */}
            <div className="absolute top-20 right-4 w-28 h-40 bg-slate-900 rounded-2xl overflow-hidden border-2 border-white/20 z-30 shadow-2xl transition-all">
              <div 
                ref={localVideoRef} 
                className="w-full h-full relative overflow-hidden [&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full [&>div]:!h-full [&>div]:!w-full"
              />
              {isCameraOff && (
                <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-1.5 text-gray-400 z-10">
                  <VideoOff size={20} />
                  <span className="text-[10px] font-bold">Cam Off</span>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Audio Call Mode View */
          <div className="flex flex-col items-center justify-center my-auto space-y-6 z-10 mt-24">
            <div className="relative">
              <div className="absolute -inset-4 bg-orange-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-orange-500 shadow-2xl relative">
                <img
                  src={astrologer?.image || "https://randomuser.me/api/portraits/women/65.jpg"}
                  alt={astrologer?.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-2xl font-bold">{astrologer?.name || "Astrologer"}</h3>
              <p className="text-emerald-400 text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Active Voice Call
              </p>
            </div>
          </div>
        )}

        {/* Bottom Control Action Bar Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center gap-3 pb-8 pt-12 px-6 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
          <div className="flex items-center justify-center gap-6">
            
            {/* Mic Toggle */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-90 ${
                isMuted 
                  ? "bg-rose-500 text-white shadow-rose-500/30 border-2 border-rose-400" 
                  : "bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md"
              }`}
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-700 hover:to-rose-600 flex items-center justify-center shadow-xl shadow-red-600/40 transform active:scale-90 transition-all cursor-pointer border border-red-400/40"
            >
              <PhoneOff size={26} className="text-white" />
            </button>

            {/* Camera Toggle */}
            {isVideo ? (
              <button
                onClick={toggleCamera}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-90 ${
                  isCameraOff 
                    ? "bg-rose-500 text-white shadow-rose-500/30 border-2 border-rose-400" 
                    : "bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md"
                }`}
              >
                {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            ) : (
              <div className="w-14 h-14"></div>
            )}

          </div>
          
          <p className="text-[11px] font-medium text-white/50 tracking-wider">
            Tap red button to end call
          </p>
        </div>

      </div>
    );
  }

  // 3. COMPLETED Call summary and rating screen
  if (sessionStatus === "COMPLETED") {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex justify-center text-gray-900">
        <div className="w-full max-w-[430px] bg-white min-h-screen flex flex-col justify-between p-6 shadow-xl relative">
          
          <div className="flex-1 flex flex-col justify-center items-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={36} className="text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900">Call Finished</h2>
            <p className="text-sm text-gray-500 mt-1">Thank you for consulting with {astrologer?.name || "us"}</p>

            {/* Receipt Summary Card */}
            <div className="w-full bg-[#F3F4F6] rounded-3xl p-5 mt-8 space-y-4 border border-gray-100">
              <div className="flex justify-between items-center text-sm border-b border-gray-200/60 pb-3">
                <span className="text-gray-500 font-medium">Duration</span>
                <span className="font-bold text-gray-800">{summaryData?.totalDurationMinutes || 1} min</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-200/60 pb-3">
                <span className="text-gray-500 font-medium">Rate per minute</span>
                <span className="font-bold text-gray-800">₹{ratePerMinute}/min</span>
              </div>
              <div className="flex justify-between items-center text-base pt-1">
                <span className="text-gray-900 font-bold">Total Charged</span>
                <span className="font-extrabold text-orange-600 text-lg">₹{summaryData?.totalAmountDeducted || 0}</span>
              </div>
            </div>

            {/* Rating Stars Form */}
            <form onSubmit={handleRateSession} className="w-full mt-8 space-y-5">
              <div className="text-center space-y-2">
                <label className="block text-sm font-bold text-gray-700">How was your call experience?</label>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={`${
                          star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Leave a Review (Optional)</label>
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Tell us what you liked or how the astrologer helped..."
                  className="w-full border border-gray-200 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-24 resize-none transition-all placeholder:text-gray-400 bg-gray-50"
                />
              </div>

              <button
                type="submit"
                disabled={submittingRate}
                className="w-full py-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white text-sm font-bold shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {submittingRate ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate("/call")}
              className="text-sm font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Skip Rating & Back to Calls
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback for other ending statuses (missed, rejected, cancelled, etc.)
  return null;
}
