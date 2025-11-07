// Homepage.jsx - Verda's work (SCRUM-12)

import React from 'react';
import { Link } from 'react-router-dom';
import './Homepage.css';

function Homepage() {
  return (
    <div className="homepage-container">
      <header className="welcome-header">
        <h1>Welcome to Pet Shop 🐾</h1>
        <p>Best products for your furry friends are here.</p>
        <Link to="/products" className="cta-button">
          Start Shopping Now
        </Link>
      </header>

      <section className="featured-products">
        <h2>Featured Products</h2>
        <div className="no-products">
          Products will be displayed here. Please login or signup to continue.
        </div>
      </section>
    </div>
  );
}

export default Homepage;

