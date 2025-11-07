import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productsAPI } from '../api';
import ProductCard from './ProductCard';
import './ProductDisplay.css';

function ProductDisplay() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get category from URL query parameter (from Menubar)
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setCategory(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [sortBy, category]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (sortBy) params.sort = sortBy;
      if (category) params.category = category;
      
      const response = await productsAPI.getProducts(params);
      setProducts(response.data.products || []);
      setError('');
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProductsWithSearch();
  };

  const fetchProductsWithSearch = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (sortBy) params.sort = sortBy;
      if (category) params.category = category;
      
      const response = await productsAPI.getProducts(params);
      setProducts(response.data.products || []);
      setError('');
    } catch (err) {
      setError('Failed to search products. Please try again.');
      console.error('Error searching products:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-display-container">
      {/* Header removed - Menubar now handles navigation */}

      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search products by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">Search</button>
        </form>

        <div className="filter-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="">Sort by...</option>
            <option value="price">Price (Low to High)</option>
            <option value="popularity">Popularity</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="Food">Food</option>
            <option value="Accessories">Accessories</option>
            <option value="Housing">Housing</option>
            <option value="Toys">Toys</option>
          </select>

          <button onClick={fetchProducts} className="reset-button">
            Reset Filters
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="no-products">No products found.</div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductDisplay;

