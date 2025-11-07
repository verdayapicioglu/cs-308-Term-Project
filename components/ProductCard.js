import React from 'react';
import './ProductCard.css';

function ProductCard({ product }) {
  const isOutOfStock = product.quantity_in_stock === 0;

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
          <div className="product-stock">
            In Stock: {product.quantity_in_stock}
          </div>
          <div className="product-category">{product.category}</div>
        </div>
        <button 
          className="add-to-cart-button" 
          disabled={isOutOfStock}
          title={isOutOfStock ? 'This product is out of stock' : 'Add to cart'}
        >
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

export default ProductCard;

