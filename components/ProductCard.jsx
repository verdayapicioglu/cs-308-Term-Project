import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { wishlistAPI } from './api';
import './ProductCard.css';

function ProductCard({ product }) {
  const navigate = useNavigate();
  // Handle missing quantity_in_stock - default to available if not specified
  const quantity = product.quantity_in_stock ?? 1;
  const isOutOfStock = quantity === 0;
  const isLowStock = quantity > 0 && quantity <= 3; // Low stock threshold: 3 or fewer units
  const { addToCart } = useCart();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem('is_authenticated') === 'true';
    setIsAuthenticated(authStatus);
    if (authStatus) {
      checkWishlistStatus();
    }
  }, [product.id]);

  const checkWishlistStatus = async () => {
    try {
      const response = await wishlistAPI.getWishlist();
      const items = response.data.items || [];
      const found = items.some(item => item.product_id === product.id);
      setIsInWishlist(found);
    } catch (error) {
      // Silently fail - user might not have wishlist yet
      setIsInWishlist(false);
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation(); // Prevent navigation when clicking add to cart
    if (!isOutOfStock) {
      addToCart(product);
    }
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation(); // Prevent navigation when clicking wishlist button
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (isInWishlist) {
        await wishlistAPI.removeFromWishlistByProduct(product.id);
        setIsInWishlist(false);
      } else {
        await wishlistAPI.addToWishlist({
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          image_url: product.image_url || '',
          description: product.description || ''
        });
        setIsInWishlist(true);
      }
      
      // Dispatch custom event for wishlist update
      window.dispatchEvent(new CustomEvent('wishlistUpdated'));
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const renderStars = (rating) => {
    const stars = [];
    const safeRating = rating || 0;

    for (let i = 0; i < 5; i++) {
      const fillPercentage = Math.min(100, Math.max(0, (safeRating - i) * 100));

      if (fillPercentage > 0) {
        stars.push(
          <span
            key={i}
            className="star filled"
            style={{ '--percent': `${fillPercentage}%` }}
          >
            ★
          </span>
        );
      } else {
        stars.push(<span key={i} className="star">★</span>);
      }
    }
    return stars;
  };

  return (
    <div
      className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="product-image">
        <img
          src={product.image_url || 'https://via.placeholder.com/300x300?text=Product'}
          alt={product.name}
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300x300?text=Product';
          }}
        />
        {isOutOfStock && <div className="stock-badge">Out of Stock</div>}
        <button
          className={`wishlist-button ${isInWishlist ? 'active' : ''}`}
          onClick={handleWishlistToggle}
          title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isInWishlist ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-rating">
          {renderStars(product.average_rating)}
          <span className="rating-value">
            {product.average_rating ? product.average_rating.toFixed(1) : '0.0'}
            {' '}({product.rating_count !== undefined ? product.rating_count : 0})
          </span>
        </div>
        <p className="product-description">{product.description}</p>
        <div className="product-details">
          <div className="product-price">₺{product.price.toFixed(2)}</div>
          {product.quantity_in_stock !== undefined && (
            <div className="product-stock">
              In Stock: {product.quantity_in_stock}
              {isLowStock && (
                <div className="low-stock-warning">
                  Last {product.quantity_in_stock} {product.quantity_in_stock === 1 ? 'unit' : 'units'}!
                </div>
              )}
            </div>
          )}
          <div className="product-category">{product.category}</div>
        </div>
        <button
          className="add-to-cart-button"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          title={isOutOfStock ? 'This product is out of stock' : 'Add to cart'}
          style={{ cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

export default ProductCard;