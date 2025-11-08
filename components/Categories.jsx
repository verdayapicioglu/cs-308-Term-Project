import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { productsAPI } from "../product_manager_api";
import "./Categories.css";

const CATEGORIES = [
  "Food",
  "Collars & Leashes",
  "Food & Water Bowls",
  "Toys",
  "Grooming & Hygiene",
  "Treats & Snacks",
];

export default function Categories() {
  const [categoryData, setCategoryData] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        const response = await productsAPI.getProducts({});
        const products = response?.data ?? [];

        // Group products by category
        const grouped = {};
        CATEGORIES.forEach((cat) => {
          grouped[cat] = products.filter((p) => p.category === cat);
        });

        setCategoryData(grouped);
      } catch (err) {
        console.error("Error loading categories:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  const handleCategoryClick = (category) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
  };

  if (loading) {
    return <div className="categories-page">Loading categories...</div>;
  }

  return (
    <div className="categories-page">
      <h1>Product Categories</h1>
      <p className="categories-subtitle">
        Browse our wide selection of pet products by category
      </p>

      <div className="categories-grid">
        {CATEGORIES.map((category) => {
          const products = categoryData[category] || [];
          const totalProducts = products.length;
          const totalStock = products.reduce(
            (sum, p) => sum + (p.quantity_in_stock || 0),
            0
          );

          return (
            <div
              key={category}
              className="category-card"
              onClick={() => handleCategoryClick(category)}
            >
              <div className="category-card-header">
                <h3>{category}</h3>
                <p>{totalProducts} product{totalProducts !== 1 ? "s" : ""}</p>
              </div>
              <div className="category-products">
                {products.slice(0, 3).map((product) => (
                  <div key={product.id} className="category-product-item">
                    <div className="category-product-info">
                      <strong>{product.name}</strong>
                      <span>${product.price.toFixed(2)}</span>
                    </div>
                    <small>Stock: {product.quantity_in_stock || 0}</small>
                  </div>
                ))}
                {totalProducts > 3 && (
                  <div className="category-more">
                    +{totalProducts - 3} more product
                    {totalProducts - 3 !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
              <div className="category-footer">
                <span>Total Stock: {totalStock}</span>
                <button className="view-category-btn">View All →</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

