import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wishlistAPI } from './api';
import { useCart } from '../context/CartContext';
import './Wishlist.css';

function Wishlist() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/wishlist' } });
      return;
    }
    loadWishlist();
  }, [navigate]);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await wishlistAPI.getWishlist();
      setWishlistItems(response.data.items || []);
      setError('');
    } catch (err) {
      console.error('Error loading wishlist:', err);
      setError('Failed to load wishlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (itemId) => {
    try {
      await wishlistAPI.removeFromWishlist(itemId);
      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      alert('Failed to remove item from wishlist');
    }
  };

  const handleAddToCart = async (item) => {
    try {
      addToCart({
        id: item.product_id,
        name: item.product_name,
        price: parseFloat(item.price),
        quantity: 1,
        image_url: item.image_url
      });
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Failed to add item to cart');
    }
  };

  if (loading) {
    return (
      <div className="wishlist-container">
        <div className="loading">Loading wishlist...</div>
      </div>
    );
  }

  return (
    <div className="wishlist-container">
      <h1>My Wishlist</h1>
      {error && <div className="error-message">{error}</div>}
      
      {wishlistItems.length === 0 ? (
        <div className="empty-wishlist">
          <p>Your wishlist is empty.</p>
          <button onClick={() => navigate('/products')} className="browse-products-button">
            Browse Products
          </button>
        </div>
      ) : (
        <>
          <div className="wishlist-items">
            {wishlistItems.map((item) => (
              <div key={item.id} className="wishlist-item-card">
                <div 
                  className="wishlist-item-image"
                  onClick={() => navigate(`/product/${item.product_id}`)}
                >
                  <img
                    src={item.image_url || 'https://via.placeholder.com/200x200?text=Product'}
                    alt={item.product_name}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200x200?text=Product';
                    }}
                  />
                </div>
                <div className="wishlist-item-info">
                  <h3 
                    className="wishlist-item-name"
                    onClick={() => navigate(`/product/${item.product_id}`)}
                  >
                    {item.product_name}
                  </h3>
                  <p className="wishlist-item-price">₺{parseFloat(item.price).toFixed(2)}</p>
                  {item.description && (
                    <p className="wishlist-item-description">{item.description}</p>
                  )}
                  <div className="wishlist-item-actions">
                    <button
                      className="add-to-cart-button"
                      onClick={() => handleAddToCart(item)}
                    >
                      Add to Cart
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveFromWishlist(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="wishlist-summary">
            <p>Total items: {wishlistItems.length}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default Wishlist;

