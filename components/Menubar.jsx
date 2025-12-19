import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Menubar.css";
import { clearUserData } from "./api";

export default function Menubar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication status on mount and when location changes
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem("is_authenticated") === "true";
      const adminStatus = localStorage.getItem("is_admin") === "true" || 
                          localStorage.getItem("is_staff") === "true" || 
                          localStorage.getItem("is_superuser") === "true";
      const email = localStorage.getItem("user_email") || "";

      setIsAuthenticated(authStatus);
      setIsAdmin(adminStatus);
      setUserEmail(email);
    };
    
    // Check immediately
    checkAuth();
  }, [location]);

  // Listen for storage changes (when user logs in/out in another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const authStatus = localStorage.getItem("is_authenticated") === "true";
      const adminStatus = localStorage.getItem("is_admin") === "true" || 
                          localStorage.getItem("is_staff") === "true" || 
                          localStorage.getItem("is_superuser") === "true";
      const email = localStorage.getItem("user_email") || "";

      setIsAuthenticated(authStatus);
      setIsAdmin(adminStatus);
      setUserEmail(email);
    };

    window.addEventListener("storage", handleStorageChange);
    // Also check on focus (in case login happened in same tab)
    window.addEventListener("focus", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Clear localStorage
      clearUserData();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserEmail("");
      // Navigate to login
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local data even if API call fails
      clearUserData();
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserEmail("");
      navigate("/login");
    }
  };

  return (
    <nav className="menubar">
      <div className="logo">
        <Link to="/">Pet Shop 🐾</Link>
      </div>
      <div className="menu-links">
        <Link to="/">Home</Link>
        <Link to="/products">Products</Link>
        <Link to="/categories">Categories</Link>
        <Link to="/about">About Us</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/profile">Profile</Link>
        {isAdmin && (
          <>
            <Link to="/product-manager/comments">Comment Approval</Link>
            <Link to="/delivery/dashboard">Delivery Dashboard</Link>
          </>
        )}
      </div>
      <div className="user-section">
        {isAuthenticated ? (
          <>
            <span className="user-email">{userEmail}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link className="login-link" to="/login">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}