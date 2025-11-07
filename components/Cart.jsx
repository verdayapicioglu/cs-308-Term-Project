// Cart.jsx - Sepet Sayfası

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Cart.css';

function Cart() {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('is_authenticated');
  const userEmail = localStorage.getItem('user_email');
  const userName = localStorage.getItem('user_name');
  
  // Mock sepet verileri (localStorage'dan)
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Mock sepet verilerini yükle
    const savedCart = localStorage.getItem('cart_items');
    if (savedCart) {
      const items = JSON.parse(savedCart);
      setCartItems(items);
      calculateTotal(items);
    } else {
      // Örnek sepet verileri
      const mockCart = [
        { id: 1, name: 'Köpek Maması', price: 150, quantity: 2, image: '🐕' },
        { id: 2, name: 'Kedi Kumu', price: 80, quantity: 1, image: '🐱' },
      ];
      setCartItems(mockCart);
      localStorage.setItem('cart_items', JSON.stringify(mockCart));
      calculateTotal(mockCart);
    }
  }, [isAuthenticated, navigate]);

  const calculateTotal = (items) => {
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(totalPrice);
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) {
      removeItem(id);
      return;
    }
    const updatedItems = cartItems.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedItems);
    localStorage.setItem('cart_items', JSON.stringify(updatedItems));
    calculateTotal(updatedItems);
  };

  const removeItem = (id) => {
    const updatedItems = cartItems.filter(item => item.id !== id);
    setCartItems(updatedItems);
    localStorage.setItem('cart_items', JSON.stringify(updatedItems));
    calculateTotal(updatedItems);
  };

  const handleCheckout = () => {
    alert('Ödeme işlemi yakında eklenecek!');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>Sepetim 🛒</h1>
        <p>Merhaba, {userName || userEmail}!</p>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Sepetiniz boş</h2>
          <p>Henüz sepetinize ürün eklemediniz.</p>
          <button onClick={() => navigate('/products')} className="shop-button">
            Alışverişe Başla
          </button>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map(item => (
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
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="remove-btn"
                  >
                    🗑️ Kaldır
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
              <span>Ara Toplam:</span>
              <span>₺{total.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Kargo:</span>
              <span className="free-shipping">Ücretsiz</span>
            </div>
            <div className="summary-row total-row">
              <span>Toplam:</span>
              <strong>₺{total.toFixed(2)}</strong>
            </div>
            <button onClick={handleCheckout} className="checkout-button">
              Ödemeye Geç
            </button>
            <button onClick={() => navigate('/products')} className="continue-shopping">
              Alışverişe Devam Et
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;

