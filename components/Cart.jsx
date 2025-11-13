// Cart.jsx - Cart Page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Cart.css';
import PaymentMockFlow from './PaymentMockFlow';

function Cart() {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('is_authenticated');
  const userEmail = localStorage.getItem('user_email');
  const userName = localStorage.getItem('user_name');
  
  // Cart data (from localStorage)
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);

  // Payment flow state
  const [showPayment, setShowPayment] = useState(false);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Load cart data
    const savedCart = localStorage.getItem('cart_items');
    if (savedCart) {
      const items = JSON.parse(savedCart);
      setCartItems(items);
      calculateTotal(items);
    } else {
      // Example cart data (fallback)
      const mockCart = [
        { id: 1, name: 'Dog Food', price: 150, quantity: 2, image: '🐕' },
        { id: 2, name: 'Cat Litter', price: 80, quantity: 1, image: '🐱' },
      ];
      setCartItems(mockCart);
      localStorage.setItem('cart_items', JSON.stringify(mockCart));
      calculateTotal(mockCart);
    }
  }, [isAuthenticated, navigate]);

  const calculateTotal = (items) => {
    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setTotal(totalPrice);
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(id);
      return;
    }
    const updatedItems = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedItems);
    localStorage.setItem('cart_items', JSON.stringify(updatedItems));
    calculateTotal(updatedItems);
  };

  const removeItem = (id) => {
    const updatedItems = cartItems.filter((item) => item.id !== id);
    setCartItems(updatedItems);
    localStorage.setItem('cart_items', JSON.stringify(updatedItems));
    calculateTotal(updatedItems);
  };

  // Open payment modal
  const handleCheckout = () => {
    setShowPayment(true);
  };

  // When payment is successful (keep modal on success screen; close via Continue)
  const handlePaymentSuccess = (newOrderId) => {
    setOrderId(newOrderId);
    // PaymentMockFlow will show success screen and close when user clicks Continue
  };

  // When user closes payment modal (X or Continue)
  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>My Cart 🛒</h1>
        <p>Hello, {userName || userEmail}!</p>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>You haven't added any products yet.</p>
          <button
            onClick={() => navigate('/products')}
            className="shop-button"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-image">
                  <span className="item-emoji">{item.image}</span>
                </div>
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  <p className="item-price">₺{item.price.toFixed(2)}</p>
                </div>
                <div className="cart-item-controls">
                  <div className="quantity-controls">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="remove-btn"
                  >
                    🗑️ Remove
                  </button>
                </div>
                <div className="cart-item-total">
                  <strong>₺{(item.price * item.quantity).toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₺{total.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span className="free-shipping">Free</span>
            </div>
            <div className="summary-row total-row">
              <span>Total:</span>
              <strong>₺{total.toFixed(2)}</strong>
            </div>

            <button onClick={handleCheckout} className="checkout-button">
              Proceed to Payment
            </button>
            <button
              onClick={() => navigate('/products')}
              className="continue-shopping"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {showPayment && (
        <PaymentMockFlow
          amount={total}
          currency="TRY"
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
    </div>
  );
}

export default Cart;
