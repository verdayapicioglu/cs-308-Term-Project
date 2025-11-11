// Homepage.jsx

import React from "react";
import "./Homepage.css";
import Products from "./Products"; // Import the Products component

function Homepage() {
  return (
    <div className="homepage-container">
      <header className="welcome-header">
        <h1>Welcome to Our Pet Shop!</h1>
        <p>Find the best products for your furry friends.</p>
        <a href="/products" className="cta-button">
          Start Shopping Now
        </a>
      </header>

      <section className="featured-products">
        <h2>Featured Products</h2>
        <p className="section-subtitle">
          Here are some of our most popular items, specially selected for your pets!
        </p>

        {/* Display limited number of products (e.g., 6) */}
        <Products showFilters={false} limit={6} />
      </section>
    </div>
  );
}

export default Homepage;
