import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "./ProductCard";
import "./Products.css";
import { productsAPI } from "../product_manager_api";

const CATEGORIES = [
  "Food",
  "Collars & Leashes",
  "Food & Water Bowls",
  "Toys",
  "Grooming & Hygiene",
  "Treats & Snacks",
];

export default function Products({ showFilters = true, limit = null }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [sortBy, setSortBy] = useState("");

  // Sync category state with URL params
  useEffect(() => {
    if (showFilters) {
      const categoryParam = searchParams.get("category");
      setSelectedCategory(categoryParam || "");
    }
  }, [searchParams, showFilters]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = {};
        // Only apply filters if showFilters is true
        if (showFilters) {
          if (selectedCategory) params.category = selectedCategory;
          if (searchQuery) params.search = searchQuery;
          if (sortBy) params.sort = sortBy;
        }

        const response = await productsAPI.getProducts(params);
        let products = response?.data ?? [];
        // If limit is set, only show first N products
        if (limit && limit > 0) {
          products = products.slice(0, limit);
        }
        setItems(Array.isArray(products) ? products : []);
      } catch (err) {
        console.error("Error loading products:", err);
        setError("Failed to load products. Please try again.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCategory, searchQuery, sortBy, showFilters, limit]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Search is handled by useEffect
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    if (category) {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
  };

  const handleReset = () => {
    setSelectedCategory("");
    setSearchQuery("");
    setSortBy("");
    setSearchParams({});
  };



  return (
    <div className={showFilters ? "products-page" : ""}>
      {showFilters && <h1>Our Products</h1>}

      {showFilters && (
        <div className="products-filters">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </form>

          <div className="filter-controls">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="">Sort by...</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="popularity">Popularity</option>
            </select>

            <button onClick={handleReset} className="reset-button">
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="no-products">Loading…</div>
      ) : error ? (
        <div className="no-products">{error}</div>
      ) : items.length === 0 ? (
        <div className="no-products">No products found.</div>
      ) : (
        <>
          {showFilters && (
            <div className="products-count">
              Showing {items.length} product{items.length !== 1 ? "s" : ""}
            </div>
          )}
          <div className="products-grid">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}