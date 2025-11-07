// Menubar.jsx - Verda's work (SCRUM-16)

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Menubar.css';

function Menubar() {
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('user_email');

  const handleLogout = () => {
    // Mock sistem için temizlik
    localStorage.removeItem('firebase_token');
    localStorage.removeItem('user_uid');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    localStorage.removeItem('is_authenticated');
    navigate('/login');
  };

  return (
    <nav className="menubar">
      <div className="logo">
        <Link to="/">Pet Shop <span className="paw-icon-nav">🐾</span></Link>
      </div>
      <ul className="menu-items">
        <li><Link to="/">Ana Sayfa</Link></li>
        
        {/* Kategoriler Dropdown */}
        <li 
          className="dropdown"
          onMouseEnter={() => setCategoriesDropdownOpen(true)}
          onMouseLeave={() => setCategoriesDropdownOpen(false)}
        >
          <Link to="/products" className="dropdown-trigger">Kategoriler</Link>
          {categoriesDropdownOpen && (
            <ul className="dropdown-content">
              <li><Link to="/products?category=Food">Köpek Ürünleri</Link></li>
              <li><Link to="/products?category=Accessories">Kedi Ürünleri</Link></li>
              <li><Link to="/products?category=Housing">Kuş Ürünleri</Link></li>
              <li><Link to="/products?category=Toys">Akvaryum</Link></li>
            </ul>
          )}
        </li>
        
        <li><Link to="/about">Hakkımızda</Link></li>
        
        {userEmail ? (
          <>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/cart">Sepetim</Link></li>
            <li className="user-menu">
              <span className="user-email">{userEmail}</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </li>
          </>
        ) : (
          <li><Link to="/login">Giriş Yap</Link></li>
        )}
      </ul>
    </nav>
  );
}

export default Menubar;

