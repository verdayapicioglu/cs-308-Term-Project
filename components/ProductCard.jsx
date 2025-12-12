import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

function ProductCard({ product }) {
  const navigate = useNavigate();
  // Handle missing quantity_in_stock - default to available if not specified
  const quantity = product.quantity_in_stock ?? 1;
  const isOutOfStock = quantity === 0;
  const isLowStock = quantity > 0 && quantity <= 3; // Low stock threshold: 3 or fewer units
  const { addToCart } = useCart();

  const handleAddToCart = (e) => {
    e.stopPropagation(); // Prevent navigation when clicking add to cart
    if (!isOutOfStock) {
      addToCart(product);
    }
  };

  const handleCardClick = () => {
    navigate(`/product/${product.id}`);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="star">★</span>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<span key={i} className="star">★</span>); // Using full star for simplicity or could use unicode half star if font supports
      } else {
        stars.push(<span key={i} className="star" style={{ color: '#d1d5db' }}>★</span>);
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
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-rating">
          {renderStars(product.rating)}
          <span className="rating-value">({product.rating ? product.rating.toFixed(1) : '0.0'})</span>
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