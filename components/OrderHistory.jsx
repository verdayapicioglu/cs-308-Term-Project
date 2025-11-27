import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderHistory.css';
import { productManagerAPI } from './api';
import { authAPI } from './api';

function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    loadUserEmail();
  }, []);

  useEffect(() => {
    if (userEmail) {
      loadOrderHistory();
    }
  }, [userEmail]);

  const loadUserEmail = async () => {
    // Önce localStorage'dan email al (order'lar bu email ile kaydediliyor)
    const storedEmail = localStorage.getItem('user_email');
    if (storedEmail) {
      setUserEmail(storedEmail);
      return;
    }
    
    // Eğer localStorage'da yoksa backend'den al
    try {
      const response = await authAPI.getCurrentUser();
      if (response.data && response.data.email) {
        setUserEmail(response.data.email);
      } else {
        setError('User email not found. Please log in again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to get user email:', err);
      setError('Failed to load user information. Please log in again.');
      setLoading(false);
    }
  };

  const loadOrderHistory = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading order history for email:', userEmail);
      const response = await productManagerAPI.getOrderHistory(userEmail);
      console.log('Order history response:', response.data);
      if (response.data && response.data.orders) {
        setOrders(response.data.orders);
        console.log('Orders loaded:', response.data.orders.length);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to load order history:', err);
      setError('Failed to load order history. Please try again later.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      'processing': 'status-processing',
      'in-transit': 'status-in-transit',
      'delivered': 'status-delivered',
    };
    return statusMap[status.toLowerCase()] || 'status-unknown';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      'processing': 'Processing',
      'in-transit': 'In Transit',
      'delivered': 'Delivered',
    };
    return labelMap[status.toLowerCase()] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(dateString));
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="order-history-page">
        <div className="order-history-container">
          <div className="loading-message">
            <p>Loading order history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-history-page">
      <div className="order-history-container">
        <div className="order-history-header">
          <button 
            className="back-button" 
            onClick={() => navigate('/profile')}
            aria-label="Back to profile"
          >
            <span className="back-arrow">←</span>
            <span>Back to Profile</span>
          </button>
          <h1>Order History</h1>
          <p className="order-history-subtitle">
            View all your past orders and track their status
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {orders.length === 0 && !error ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h2>No orders yet</h2>
            <p>You haven't placed any orders yet. Start shopping to see your order history here!</p>
            <button 
              className="primary-button"
              onClick={() => navigate('/products')}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.delivery_id} className="order-card">
                <div className="order-card-header">
                  <div className="order-id-section">
                    <span className="order-label">Order ID</span>
                    <span className="order-id">{order.delivery_id}</span>
                  </div>
                  <span className={`status-badge ${getStatusClass(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>

                <div className="order-card-body">
                  <div className="order-info-row">
                    <div className="order-info-item">
                      <span className="info-label">Product</span>
                      <span className="info-value">{order.product_name}</span>
                    </div>
                    <div className="order-info-item">
                      <span className="info-label">Quantity</span>
                      <span className="info-value">×{order.quantity}</span>
                    </div>
                  </div>

                  <div className="order-info-row">
                    <div className="order-info-item">
                      <span className="info-label">Order Date</span>
                      <span className="info-value">{formatDate(order.order_date)}</span>
                    </div>
                    {order.delivery_date && (
                      <div className="order-info-item">
                        <span className="info-label">Delivery Date</span>
                        <span className="info-value">{formatDate(order.delivery_date)}</span>
                      </div>
                    )}
                  </div>

                  <div className="order-info-item full-width">
                    <span className="info-label">Delivery Address</span>
                    <span className="info-value address">{order.delivery_address}</span>
                  </div>
                </div>

                <div className="order-card-footer">
                  <div className="order-total">
                    <span className="total-label">Total</span>
                    <span className="total-amount">{formatCurrency(order.total_price)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderHistory;

