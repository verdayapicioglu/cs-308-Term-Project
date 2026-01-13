import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderHistory.css';
import { productManagerAPI } from './api';
import { authAPI } from './api';
import { generateInvoicePdf } from './invoiceUtils';

function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundQuantity, setRefundQuantity] = useState(1);
  const [refundLoading, setRefundLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: '/order-history' } });
      return;
    }

    loadUserEmail();
  }, [navigate]);

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
        // Redirect to login after a short delay
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      console.error('Failed to get user email:', err);
      setError('Failed to load user information. Please log in again.');
      setLoading(false);
      // Redirect to login after a short delay
      setTimeout(() => navigate('/login'), 2000);
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
      'cancelled': 'status-cancelled',
    };
    return statusMap[status.toLowerCase()] || 'status-unknown';
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      'processing': 'Processing',
      'in-transit': 'In Transit',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
    };
    return labelMap[status.toLowerCase()] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: 'short',
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

  const canRequestRefund = (order, item) => {
    if (order.status !== 'delivered') return false;
    if (!order.delivery_date) return false;

    const deliveryDate = new Date(order.delivery_date);
    const today = new Date();
    const daysSinceDelivery = Math.floor((today - deliveryDate) / (1000 * 60 * 60 * 24));

    return daysSinceDelivery <= 30;
  };

  const handleRefundClick = (order, item) => {
    setSelectedItem({ order, item });
    setRefundQuantity(1);
    setRefundReason('');
    setShowRefundModal(true);
  };

  const handleRefundSubmit = async () => {
    if (!refundReason.trim()) {
      alert('Please provide a reason for the refund request');
      return;
    }

    if (refundQuantity < 1 || refundQuantity > selectedItem.item.quantity) {
      alert(`Quantity must be between 1 and ${selectedItem.item.quantity}`);
      return;
    }

    setRefundLoading(true);
    try {
      await productManagerAPI.createRefundRequest({
        order_id: selectedItem.order.delivery_id,
        order_item_id: selectedItem.item.id,
        product_id: selectedItem.item.product_id,
        quantity: refundQuantity,
        reason: refundReason,
        customer_email: userEmail
      });


      // Show success message instead of alert
      setSuccessMessage('Refund request submitted successfully! We will process it shortly.');

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);

      setShowRefundModal(false);
      setSelectedItem(null);
      setRefundReason('');
      setRefundQuantity(1);
      loadOrderHistory(); // Reload orders
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to submit refund request';
      console.error('Refund request error:', err);
      console.error('Error details:', err.response?.data);
      alert(`Error: ${errorMessage}`);
    } finally {
      setRefundLoading(false);
    }
  };

  const handleDownloadInvoice = (order) => {
    try {
      // Convert order format to match invoiceUtils expected format
      const addressParts = order.delivery_address ? order.delivery_address.split(',') : [];
      const totalPrice = parseFloat(order.total_price || 0);

      // Calculate subtotal and tax (assuming 18% VAT included in total)
      const subtotal = totalPrice / 1.18;
      const tax = totalPrice - subtotal;

      const invoiceOrder = {
        id: order.delivery_id,
        customerName: order.customer_name,
        address: {
          line1: addressParts[0]?.trim() || order.delivery_address || '',
          line2: addressParts[1]?.trim() || '',
          city: addressParts[addressParts.length - 1]?.trim() || '',
          zip: '',
          country: 'Turkey'
        },
        date: order.order_date || new Date().toISOString().split('T')[0],
        paymentMethod: 'Credit Card', // Default payment method
        items: (order.items || []).map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: parseFloat(item.price)
        })),
        subtotal: subtotal,
        tax: tax,
        total: totalPrice
      };

      generateInvoicePdf(invoiceOrder);
    } catch (err) {
      console.error('Error generating invoice:', err);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to cancel order ${order.delivery_id}?`)) {
      return;
    }

    setCancelLoading(true);
    try {
      await productManagerAPI.cancelOrder(order.delivery_id, userEmail);
      alert('Order cancelled successfully!');
      loadOrderHistory(); // Reload orders
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to cancel order';
      console.error('Cancel order error:', err);
      alert(`Error: ${errorMessage}`);
    } finally {
      setCancelLoading(false);
    }
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

        {successMessage && (
          <div className="success-message">
            {successMessage}
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
                  <div className="order-info-item full-width product-row">
                    <span className="info-label">Products:</span>
                    <div className="order-items-list">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => (
                          <div key={idx} className="order-item-detail">
                            <span className="item-name">{item.product_name}</span>
                            <span className="item-qty">x{item.quantity}</span>
                            <span className="item-price">{formatCurrency(item.price)}</span>
                            {canRequestRefund(order, item) && (
                              <button
                                className="refund-button"
                                onClick={() => handleRefundClick(order, item)}
                                title="Request refund for this item"
                              >
                                Request Refund
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        /* Fallback for old/legacy data where items might be missing */
                        <div className="order-item-detail legacy-order">
                          <span className="item-name">
                            {order.product_name || "Product details unavailable (Legacy Order)"}
                          </span>
                          {order.quantity && <span className="item-qty">x{order.quantity}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="order-info-row">
                    <div className="order-info-item inline-row">
                      <span className="info-label">Order Date:</span>
                      <span className="info-value">{formatDate(order.order_date)}</span>
                    </div>
                    {order.delivery_date && (
                      <div className="order-info-item inline-row">
                        <span className="info-label">Delivery Date:</span>
                        <span className="info-value">{formatDate(order.delivery_date)}</span>
                      </div>
                    )}
                  </div>

                  <div className="order-info-item full-width inline-row">
                    <span className="info-label">Delivery Address:</span>
                    <span className="info-value address">{order.delivery_address}</span>
                  </div>
                </div>

                <div className="order-card-footer">
                  <div className="order-total">
                    <span className="total-label">Total</span>
                    <span className="total-amount">{formatCurrency(order.total_price)}</span>
                  </div>
                  <div className="order-actions">
                    {order.status === 'processing' && (
                      <button
                        className="cancel-order-button"
                        onClick={() => handleCancelOrder(order)}
                        disabled={cancelLoading}
                        title="Cancel this order"
                      >
                        {cancelLoading ? 'Cancelling...' : '❌ Cancel Order'}
                      </button>
                    )}
                    <button
                      className="download-invoice-button"
                      onClick={() => handleDownloadInvoice(order)}
                      title="Download Invoice PDF"
                    >
                      📄 Download Invoice
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refund Request Modal */}
        {showRefundModal && selectedItem && (
          <div className="modal-overlay" onClick={() => setShowRefundModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Request Refund</h2>
              <div className="refund-modal-info">
                <p><strong>Product:</strong> {selectedItem.item.product_name}</p>
                <p><strong>Order ID:</strong> {selectedItem.order.delivery_id}</p>
                <p><strong>Price:</strong> {formatCurrency(selectedItem.item.price)}</p>
                <p><strong>Available Quantity:</strong> {selectedItem.item.quantity}</p>
              </div>

              <div className="form-group">
                <label>Quantity to Refund:</label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.item.quantity}
                  value={refundQuantity}
                  onChange={(e) => setRefundQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="form-group">
                <label>Reason for Refund:</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Please explain why you want to return this product..."
                  rows="4"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowRefundModal(false)}
                  disabled={refundLoading}
                >
                  Cancel
                </button>
                <button
                  className="submit-button"
                  onClick={handleRefundSubmit}
                  disabled={refundLoading}
                >
                  {refundLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderHistory;

