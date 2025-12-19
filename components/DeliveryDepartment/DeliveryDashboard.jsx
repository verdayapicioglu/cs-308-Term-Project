import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../api';
import './DeliveryDashboard.css';

function DeliveryDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await productManagerAPI.getDeliveryDashboardStats();
      setStats(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load delivery dashboard stats');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="delivery-dashboard-loading">Loading delivery dashboard...</div>;
  }

  if (error) {
    return <div className="delivery-dashboard-error">{error}</div>;
  }

  return (
    <div className="delivery-dashboard-container">
      <h1 className="delivery-dashboard-title">Delivery Department Dashboard</h1>
      
      <div className="delivery-stats-grid">
        <div className="delivery-stat-card total-orders">
          <div className="delivery-stat-icon">📦</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">{stats?.total_orders || 0}</div>
            <div className="delivery-stat-label">Total Orders</div>
          </div>
        </div>

        <div className="delivery-stat-card pending">
          <div className="delivery-stat-icon">⏳</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">{stats?.pending_deliveries || 0}</div>
            <div className="delivery-stat-label">Pending Deliveries</div>
          </div>
        </div>

        <div className="delivery-stat-card processing">
          <div className="delivery-stat-icon">🔄</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">{stats?.processing_orders || 0}</div>
            <div className="delivery-stat-label">Processing</div>
          </div>
        </div>

        <div className="delivery-stat-card in-transit">
          <div className="delivery-stat-icon">🚚</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">{stats?.in_transit_orders || 0}</div>
            <div className="delivery-stat-label">In Transit</div>
          </div>
        </div>

        <div className="delivery-stat-card delivered">
          <div className="delivery-stat-icon">✅</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">{stats?.delivered_orders || 0}</div>
            <div className="delivery-stat-label">Delivered</div>
          </div>
        </div>

        <div className="delivery-stat-card today">
          <div className="delivery-stat-icon">📅</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">{stats?.today_orders || 0}</div>
            <div className="delivery-stat-label">Today's Orders</div>
          </div>
        </div>

        <div className="delivery-stat-card recent">
          <div className="delivery-stat-icon">📊</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">{stats?.recent_orders || 0}</div>
            <div className="delivery-stat-label">Last 7 Days</div>
          </div>
        </div>

        <div className="delivery-stat-card urgent">
          <div className="delivery-stat-icon">⚠️</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">{stats?.urgent_orders || 0}</div>
            <div className="delivery-stat-label">Urgent Orders</div>
            <div className="delivery-stat-subtext">Processing &gt; 2 days</div>
          </div>
        </div>

        <div className="delivery-stat-card revenue">
          <div className="delivery-stat-icon">💰</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">${(stats?.delivered_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="delivery-stat-label">Delivered Revenue</div>
          </div>
        </div>

        <div className="delivery-stat-card avg-time">
          <div className="delivery-stat-icon">⏱️</div>
          <div className="delivery-stat-content">
            <div className="delivery-stat-value">
              {stats?.avg_delivery_days !== null && stats?.avg_delivery_days !== undefined 
                ? `${stats.avg_delivery_days} days` 
                : 'N/A'}
            </div>
            <div className="delivery-stat-label">Avg Delivery Time</div>
          </div>
        </div>
      </div>

      <div className="delivery-quick-actions">
        <h2>Quick Actions</h2>
        <div className="delivery-actions-grid">
          <button 
            className="delivery-action-btn" 
            onClick={() => window.location.href = '/delivery/orders'}
          >
            View All Orders
          </button>
          <button 
            className="delivery-action-btn" 
            onClick={() => window.location.href = '/delivery/orders?status=processing'}
          >
            Processing Orders
          </button>
          <button 
            className="delivery-action-btn" 
            onClick={() => window.location.href = '/delivery/orders?status=in-transit'}
          >
            In Transit Orders
          </button>
          <button 
            className="delivery-action-btn" 
            onClick={() => window.location.href = '/delivery/orders?status=delivered'}
          >
            Delivered Orders
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeliveryDashboard;

