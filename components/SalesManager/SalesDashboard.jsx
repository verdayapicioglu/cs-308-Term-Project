import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productManagerAPI } from '../api';
import './SalesDashboard.css';

function SalesDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // TODO: Create sales-specific stats endpoint
      // const response = await productManagerAPI.getSalesStats();
      // setStats(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load sales dashboard stats');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="sales-dashboard-loading">Loading sales dashboard...</div>;
  }

  if (error) {
    return <div className="sales-dashboard-error">{error}</div>;
  }

  return (
    <div className="sales-dashboard-container">
      <h1 className="sales-dashboard-title">Sales Manager Dashboard</h1>

      <div className="sales-stats-grid">
        <div className="sales-stat-card revenue" onClick={() => navigate('/sales-manager/revenue')}>
          <div className="sales-stat-icon">💰</div>
          <div className="sales-stat-content">
            <div className="sales-stat-value">Revenue</div>
            <div className="sales-stat-label">View Revenue & Profit</div>
          </div>
        </div>

        <div className="sales-stat-card discounts" onClick={() => navigate('/sales-manager/discounts')}>
          <div className="sales-stat-icon">🏷️</div>
          <div className="sales-stat-content">
            <div className="sales-stat-value">Discounts</div>
            <div className="sales-stat-label">Manage Product Discounts</div>
          </div>
        </div>

        <div className="sales-stat-card invoices" onClick={() => navigate('/sales-manager/invoices')}>
          <div className="sales-stat-icon">📄</div>
          <div className="sales-stat-content">
            <div className="sales-stat-value">Invoices</div>
            <div className="sales-stat-label">View & Export Invoices</div>
          </div>
        </div>

        <div className="sales-stat-card refunds" onClick={() => navigate('/sales-manager/refunds')}>
          <div className="sales-stat-icon">↩️</div>
          <div className="sales-stat-content">
            <div className="sales-stat-value">Refunds</div>
            <div className="sales-stat-label">Manage Refund Requests</div>
          </div>
        </div>
      </div>

      <div className="sales-quick-actions">
        <h2>Quick Actions</h2>
        <div className="sales-actions-grid">
          <button className="sales-action-btn" onClick={() => navigate('/sales-manager/discounts')}>
            Set Product Discounts
          </button>
          <button className="sales-action-btn" onClick={() => navigate('/sales-manager/invoices')}>
            View Invoices
          </button>
          <button className="sales-action-btn" onClick={() => navigate('/sales-manager/revenue')}>
            Revenue & Profit Analysis
          </button>
          <button className="sales-action-btn" onClick={() => navigate('/sales-manager/refunds')}>
            Refund Management
          </button>
        </div>
      </div>
    </div>
  );
}

export default SalesDashboard;

