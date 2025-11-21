// Cart.jsx

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { saveOrder } from "./reviewUtils";
import "./Cart.css";
import PaymentMockFlow from "./PaymentMockFlow";

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const navigate = useNavigate();

  const isAuthenticated = localStorage.getItem("is_authenticated");
  const userEmail = localStorage.getItem("user_email");
  const userName = localStorage.getItem("user_name");

  const [showPayment, setShowPayment] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const calculateTotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
      0
    );
  };

  const calculateTotalQuantity = () => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  const subtotal = calculateTotal();
  const totalQuantity = calculateTotalQuantity();
  const shipping = 0;
  const total = subtotal + shipping;

  
  const handleCheckout = () => {
    if (isAuthenticated) {
      setShowPayment(true);
    } else {

      navigate("/login");
    }
  };

  const handlePaymentSuccess = (newOrderId) => {
    setOrderId(newOrderId);
    
    // Save order to localStorage for review/rating functionality
    if (isAuthenticated && cartItems.length > 0) {
      const userId = localStorage.getItem('user_id') || userEmail;
      // For testing purposes, set status to 'delivered' so users can review products immediately
      // In production, this would be updated by an admin or delivery system
      const order = saveOrder({
        id: newOrderId,
        userId: userId,
        userName: userName || 'User',
        userEmail: userEmail,
        items: cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity || 1,
          price: item.price || 0,
        })),
        total: total,
        currency: 'TRY',
        status: 'delivered', // Set to 'delivered' so users can review products immediately
        deliveryAddress: localStorage.getItem('user_address') || '',
      });
      console.log('Order saved:', order);
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>My Cart 🛒</h1>
        
        {/* DEĞİŞİKLİK 4: Koşullu selamlama eklendi */}
        {isAuthenticated ? (
          <p>Hello, {userName || userEmail}!</p>
        ) : (
          <p>Hello, Guest! Please log in to check out.</p>
        )}

        {cartItems.length > 0 && (
          <p>You have {totalQuantity} item(s) in your cart.</p>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>You haven't added any items yet.</p>
          <Link to="/products">
            <button className="shop-button">Start Shopping</button>
          </Link>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-image">
                  <img
                    src={
                      item.image_url ||
                      "https://via.placeholder.com/100x100?text=Product"
                    }
                    alt={item.name}
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/100x100?text=Product";
                    }}
                  />
                </div>
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  <p className="item-price">
                    ₺{(item.price || 0).toFixed(2)}
                  </p>
                </div>
                <div className="cart-item-controls">
                  <div className="quantity-controls">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, (item.quantity || 1) - 1)
                      }
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity || 1}</span>
                    <button
                      onClick={() =>
                        updateQuantity(item.id, (item.quantity || 1) + 1)
                      }
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="remove-btn"
                  >
                    🗑️ Remove
                  </button>
                </div>
                <div className="cart-item-total">
                  <strong>
                    ₺{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </strong>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            {/* ... (Özet kısmı değişmedi) ... */}
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₺{subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping:</span>
              <span className="free-shipping">Free</span>
            </div>
            <div className="summary-row total-row">
              <span>Total:</span>
              <strong>₺{total.toFixed(2)}</strong>
            </div>

            {/* DEĞİŞİKLİK 5: Buton metni koşullu hale getirildi */}
            {/* handleCheckout fonksiyonu zaten güncellendiği için
                bu buton artık doğru şekilde çalışacak. */}
            <button onClick={handleCheckout} className="checkout-button">
              {isAuthenticated ? "Proceed to Payment" : "Login to Continue"}
            </button>

            <Link to="/products">
              <button className="continue-shopping">Continue Shopping</button>
            </Link>
          </div>
        </div>
      )}

      {/* Ödeme Modalı (Sadece isAuthenticated true ise açılacak) */}
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