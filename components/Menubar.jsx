import React from "react";
import { Link } from "react-router-dom";
import "./Menubar.css";

export default function Menubar({ user, onLogout }) {
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
      </div>
      <div className="user-section">
        {user ? (
          <>
            <span className="user-email">{user.email}</span>
            <button className="logout-btn" onClick={onLogout}>
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