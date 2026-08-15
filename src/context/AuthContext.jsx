import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("isLoggedIn") === "true"
  );
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [showModal, setShowModal] = useState(false);
  const [pendingFeature, setPendingFeature] = useState(null);
  const [pendingRedirect, setPendingRedirect] = useState(null);
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  const [userName, setUserName] = useState(
    () => localStorage.getItem("userName") || ""
  );

  const loginUser = () => {
    localStorage.setItem("isLoggedIn", "true");
    setIsLoggedIn(true);
    setShowModal(false);
  };

  const saveUser = (userData) => {
    if (userData) {
      const name = userData.name || `${userData.firstname || ""} ${userData.lastname || ""}`.trim() || "";
      const isCompleted = 
        userData.isProfileCompleted || 
        !!userData.firstname || 
        (!!name && name !== "Ravi Sharma" && name !== "Astro Client User");
      
      const updatedData = {
        ...userData,
        isProfileCompleted: isCompleted
      };

      localStorage.setItem("user", JSON.stringify(updatedData));
      setUser(updatedData);
      if (name) {
        localStorage.setItem("userName", name);
        setUserName(name);
      }
    } else {
      localStorage.removeItem("user");
      setUser(null);
      localStorage.removeItem("userName");
      setUserName("");
    }
  };

  const logoutUser = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userName");
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("phone");
    localStorage.removeItem("dob");
    setUserName("");
    setUser(null);
    setJustLoggedOut(true);
    setIsLoggedIn(false);
    setShowModal(false);
    setTimeout(() => {
      setJustLoggedOut(false);
    }, 1000);
  };

  const updateUserName = (name) => {
    localStorage.setItem("userName", name);
    setUserName(name);
  };

  const triggerLoginModal = (featureName, redirectPath) => {
    setPendingFeature(featureName);
    setPendingRedirect(redirectPath);
    setShowModal(true);
  };

  const closeLoginModal = () => {
    setShowModal(false);
    setPendingFeature(null);
    setPendingRedirect(null);
  };

  const isProfileCompleted = 
    user?.isProfileCompleted || 
    !!user?.firstname || 
    (!!user?.name && user?.name !== "Ravi Sharma" && user?.name !== "Astro Client User") || 
    false;

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        loginUser,
        logoutUser,
        user,
        saveUser,
        isProfileCompleted,
        showModal,
        setShowModal,
        pendingFeature,
        pendingRedirect,
        triggerLoginModal,
        closeLoginModal,
        justLoggedOut,
        userName,
        updateUserName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
