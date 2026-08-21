import { useEffect } from "react";
import { initSocket, disconnectSocket } from "./services/socket";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginRequiredModal from "./component/LoginRequiredModal";
import Home from "./pages/Home";
import Login from "./features/login";
import EditProfile from "./pages/EditProfile";
import Otp from "./features/Otp";
import Chat from "./pages/Chat";
import Call from "./pages/call";
import Profile from "./pages/Profile";
import AstroHistory from "./pages/AstroHistory";
import BookingHistory from "./pages/BookingHistory";
import Notifications from "./pages/Notifications";
import HelpSupport from "./pages/HelpSupport";
import LiveAstro from "./pages/LiveAstro";
import ChatSession from "./pages/ChatSession";
import CallSession from "./pages/CallSession";
import Wallet from "./pages/Wallet";
import Deposit from "./pages/Deposit";
import TransactionHistory from "./pages/TransactionHistory";
import ChatHistoryDetails from "./pages/ChatHistoryDetails";

function ProtectedRoute({ children, featureName }) {
  const { isLoggedIn, triggerLoginModal, justLoggedOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isLoggedIn && !justLoggedOut) {
      triggerLoginModal(featureName, location.pathname);
    }
  }, [isLoggedIn, justLoggedOut, triggerLoginModal, featureName, location.pathname]);

  if (!isLoggedIn) {
    const redirectPath = justLoggedOut ? "/login" : "/home";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

function InitialRedirect() {
  const { isLoggedIn, isProfileCompleted } = useAuth();
  if (isLoggedIn) {
    return <Navigate to={isProfileCompleted ? "/home" : "/editprofile?mode=onboarding"} replace />;
  }
  return <Navigate to="/login" replace />;
}

function AppContent() {
  const { isLoggedIn, isProfileCompleted } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      initSocket();
    } else {
      disconnectSocket();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && !isProfileCompleted && location.pathname !== "/editprofile" && location.pathname !== "/login" && location.pathname !== "/otp") {
      navigate("/editprofile?mode=onboarding", { replace: true, state: { from: location.pathname } });
    }
  }, [isLoggedIn, isProfileCompleted, location.pathname, navigate]);

  return (
    <>
      <Routes>
        <Route path="/" element={<InitialRedirect />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/otp" element={<Otp />} />
        
        {/* Protected Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute featureName="Profile">
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/editprofile"
          element={
            <ProtectedRoute featureName="Edit Profile">
              <EditProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking-history"
          element={
            <ProtectedRoute featureName="Booking History">
              <BookingHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/astro-history"
          element={
            <ProtectedRoute featureName="Astro History">
              <AstroHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat-history/:sessionId"
          element={
            <ProtectedRoute featureName="Chat History">
              <ChatHistoryDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute featureName="Wallet">
              <Wallet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deposit"
          element={
            <ProtectedRoute featureName="Deposit">
              <Deposit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transaction-history"
          element={
            <ProtectedRoute featureName="Transaction History">
              <TransactionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/call-session"
          element={
            <ProtectedRoute featureName="Call Session">
              <CallSession />
            </ProtectedRoute>
          }
        />

        {/* Public Routes */}
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat-session/:name" element={<ChatSession />} />
        <Route path="/call" element={<Call />} />
        <Route path="/call-session/:name" element={<CallSession />} />
        <Route path="/liveastro" element={<LiveAstro />} />
        <Route path="/live-astro" element={<LiveAstro />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/help-support" element={<HelpSupport />} />
      </Routes>
      <LoginRequiredModal />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;