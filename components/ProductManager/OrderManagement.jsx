import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../../api';
import './OrderManagement.css';

function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const response = await productManagerAPI.getOrders(statusFilter || null);
      setOrders(response.data.orders || []);
      setError('');
    } catch (err) {
      setError('Failed to load orders');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (deliveryId, newStatus) => {
    try {
      await productManagerAPI.updateOrderStatus(deliveryId, newStatus);
      fetchOrders();
    } catch (err) {
      setError('Failed to update order status');
      console.error('Error:', err);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'processing':
        return 'badge-processing';
      case 'in-transit':
        return 'badge-in-transit';
      case 'delivered':
        return 'badge-delivered';
      default:
        return 'badge-default';
    }
  };

  if (loading) {
    return <div className="om-loading">Loading orders...</div>;
  }

  return (
    <div className="order-management-container">
      <div className="om-header">
        <h1>Order & Delivery Management</h1>
        <div className="filter-controls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="">All Orders</option>
            <option value="processing">Processing</option>
            <option value="in-transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {error && <div className="om-error">{error}</div>}

      <div className="orders-grid">
        {orders.map((order) => (
          <div key={order.delivery_id} className="order-card">
            <div className="order-header">
              <div className="order-id">Order #{order.delivery_id}</div>
              <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                {order.status}
              </span>
            </div>

            <div className="order-info">
              <div className="info-row">
                <span className="info-label">Customer:</span>
                <span className="info-value">{order.customer_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{order.customer_email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Product:</span>
                <span className="info-value">{order.product_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Quantity:</span>
                <span className="info-value">{order.quantity}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Total Price:</span>
                <span className="info-value">${order.total_price}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Delivery Address:</span>
                <span className="info-value">{order.delivery_address}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Order Date:</span>
                <span className="info-value">{order.order_date}</span>
              </div>
              {order.delivery_date && (
                <div className="info-row">
                  <span className="info-label">Delivery Date:</span>
                  <span className="info-value">{order.delivery_date}</span>
                </div>
              )}
            </div>

            <div className="order-actions">
              {order.status === 'processing' && (
                <>
                  <button
                    className="btn-status in-transit"
                    onClick={() => handleStatusUpdate(order.delivery_id, 'in-transit')}
                  >
                    Mark as In Transit
                  </button>
                  <button
                    className="btn-status delivered"
                    onClick={() => handleStatusUpdate(order.delivery_id, 'delivered')}
                  >
                    Mark as Delivered
                  </button>
                </>
              )}
              {order.status === 'in-transit' && (
                <button
                  className="btn-status delivered"
                  onClick={() => handleStatusUpdate(order.delivery_id, 'delivered')}
                >
                  Mark as Delivered
                </button>
              )}
              {order.status === 'delivered' && (
                <span className="delivery-complete">✓ Delivery Complete</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="no-orders">No orders found.</div>
      )}
    </div>
  );
}

export default OrderManagement;


