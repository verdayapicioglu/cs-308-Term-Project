import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../../api';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await productManagerAPI.getDashboardStats();
      setStats(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard stats');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Product Manager Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card products">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.total_products || 0}</div>
            <div className="stat-label">Total Products</div>
          </div>
        </div>

        <div className="stat-card stock-warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.low_stock_products || 0}</div>
            <div className="stat-label">Low Stock</div>
          </div>
        </div>

        <div className="stat-card out-of-stock">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.out_of_stock_products || 0}</div>
            <div className="stat-label">Out of Stock</div>
          </div>
        </div>

        <div className="stat-card orders">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.total_orders || 0}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>

        <div className="stat-card processing">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.processing_orders || 0}</div>
            <div className="stat-label">Processing</div>
          </div>
        </div>

        <div className="stat-card in-transit">
          <div className="stat-icon">🚚</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.in_transit_orders || 0}</div>
            <div className="stat-label">In Transit</div>
          </div>
        </div>

        <div className="stat-card delivered">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.delivered_orders || 0}</div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>

        <div className="stat-card comments">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.pending_comments || 0}</div>
            <div className="stat-label">Pending Comments</div>
          </div>
        </div>

        <div className="stat-card categories">
          <div className="stat-icon">🏷️</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.total_categories || 0}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => window.location.href = '/product-manager/products'}>
            Manage Products
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/product-manager/stock'}>
            Manage Stock
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/product-manager/orders'}>
            View Orders
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/product-manager/comments'}>
            Approve Comments
          </button>
          <button className="action-btn" onClick={() => window.location.href = '/product-manager/categories'}>
            Manage Categories
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;


