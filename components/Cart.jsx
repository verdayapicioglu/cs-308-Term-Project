// Cart.jsx - Cart Page

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
// import { useCart } from "../context/CartContext"; // Kept if you need it, though not used in the logic below
import { saveOrder } from "./reviewUtils";
import "./Cart.css";
import PaymentMockFlow from "./PaymentMockFlow";

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
    // NOT: Login kontrolünü kaldırdık (Ziyaretçiler de görebilsin diye)

    // LocalStorage'dan sepeti çek
    const savedCart = localStorage.getItem('cart_items');

    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        // Eğer savedCart varsa onu yükle
        setCartItems(items);
        calculateTotal(items);
      } catch (error) {
        // Eğer veri bozuksa sepeti boşalt
        console.error("Sepet verisi okunamadı:", error);
        setCartItems([]);
        setTotal(0);
      }
    } else {
      // ELSE BLOĞU: Eğer kayıtlı sepet yoksa
      // Burayı KESİNLİKLE boş dizi [] olarak ayarlıyoruz.
      // Burada daha önce "mock data" (örnek ürün) kodu varsa silinmiş oldu.
      setCartItems([]);
      setTotal(0);
    }
  }, []); // Bağımlılık dizisi boş, sadece sayfa açılışında çalışır

  const calculateTotal = (items) => {
    const totalPrice = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    setTotal(totalPrice);
  };

  const calculateTotalQuantity = () => {
    return cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  const totalQuantity = calculateTotalQuantity();

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

  const taxRate = 0.18;
  const shipping = 0;
  const invoiceTotal = total + shipping;
  const invoiceSubtotal = invoiceTotal / (1 + taxRate);
  const invoiceTax = invoiceTotal - invoiceSubtotal;

  const invoiceOrder = {
    id: orderId || 'PENDING',
    date: new Date().toISOString().slice(0, 10),
    customerName: userName || userEmail || 'Guest',
    paymentMethod: 'Credit Card',
    address: {
      line1: 'Sabancı University',
      line2: '',
      city: 'Istanbul',
      zip: '34956',
      country: 'Turkey',
    },
    items: cartItems.map((item) => ({
      name: item.name,
      quantity: item.quantity || 1,
      price: item.price || 0,
    })),
    subtotal: invoiceSubtotal,
    tax: invoiceTax,
    total: invoiceTotal,
    totalQuantity,
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      // Logic Change: Redirect to login only when attempting to checkout
      navigate('/login');
    } else {
      setShowPayment(true);
    }
  };

  // When payment is successful
  const handlePaymentSuccess = (newOrderId) => {
    setOrderId(newOrderId);

    if (isAuthenticated && cartItems.length > 0) {
      const userId = localStorage.getItem('user_id') || userEmail;

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
        status: 'delivered',
        deliveryAddress: localStorage.getItem('user_address') || '',
      });
      console.log('Order saved:', order);
    }

    setCartItems([]);
    localStorage.removeItem('cart_items');

    setShowPayment(false);
    setTimeout(() => {
      navigate('/profile');
    }, 100);
  };

  const handlePaymentCancel = () => {
    if (orderId) {
      navigate('/profile');
    } else {
      setShowPayment(false);
    }
  };

  // REMOVED: The render guard "if (!isAuthenticated) return null;"

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>My Cart 🛒</h1>
        {/* Updated Greeting to handle Guest */}
        <p>Hello, {userName || userEmail || 'Guest'}!</p>
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
                  <img
                    src={item.image_url || 'https://via.placeholder.com/100x100?text=Product'}
                    alt={item.name}
                    className="item-img-cart"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/100x100?text=Product';
                    }}
                  />
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
              <strong>₺{(total + shipping).toFixed(2)}</strong>
            </div>

            <button onClick={handleCheckout} className="checkout-button">
              {"Proceed to Payment"}
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
          amount={invoiceTotal}
          currency="TRY"
          cartItems={cartItems}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
          order={invoiceOrder}
        />
      )}
    </div>
  );
}

export default Cart;