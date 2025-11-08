import React from 'react';
import { useCart } from '../context/CartContext';
import './ProductCard.css';

function ProductCard({ product }) {
  // Handle missing quantity_in_stock - default to available if not specified
  const quantity = product.quantity_in_stock ?? 1;
  const isOutOfStock = quantity === 0;
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    if (!isOutOfStock) {
      addToCart(product);
    }
  };

  return (
    <div className={`product-card ${isOutOfStock ? 'out-of-stock' : ''}`}>
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
        <p className="product-description">{product.description}</p>
        <div className="product-details">
          <div className="product-price">${product.price.toFixed(2)}</div>
          {product.quantity_in_stock !== undefined && (
            <div className="product-stock">
              In Stock: {product.quantity_in_stock}
            </div>
          )}
          <div className="product-category">{product.category}</div>
        </div>
        <button 
          className="add-to-cart-button" 
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          title={isOutOfStock ? 'This product is out of stock' : 'Add to cart'}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

export default ProductCard;

