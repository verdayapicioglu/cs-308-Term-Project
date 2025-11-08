import React from "react";
import { Link } from "react-router-dom";
import "./Homepage.css";
import Products from "./Products";

export default function Homepage() {
  return (
    <div className="homepage">
      <section className="hero">
        <h1>Welcome to Pet Shop 🐾</h1>
        <p>Your one-stop shop for pet care, food, and accessories.</p>
      </section>

      <section className="featured-products">
        <h2>Featured Products</h2>
        <Products />
      </section>
    </div>
  );
}