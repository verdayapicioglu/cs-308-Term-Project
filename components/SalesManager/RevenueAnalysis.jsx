import React, { useState } from 'react';
import { productManagerAPI } from '../api';
import './RevenueAnalysis.css';

// Import recharts components
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

function RevenueAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!dateRange.start_date || !dateRange.end_date) {
      setError('Please select both start and end dates');
      setLoading(false);
      return;
    }

    try {
      const response = await productManagerAPI.getRevenueProfit(
        dateRange.start_date,
        dateRange.end_date
      );
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load revenue data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasRecharts = true; // recharts is imported

  return (
    <div className="revenue-analysis-container">
      <h1 className="revenue-title">Revenue & Profit Analysis</h1>

      <form onSubmit={handleSearch} className="revenue-search-form">
        <div className="revenue-date-inputs">
          <div className="revenue-date-group">
            <label>Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              required
            />
          </div>
          <div className="revenue-date-group">
            <label>End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="revenue-search-btn" disabled={loading}>
            {loading ? 'Loading...' : 'Analyze'}
          </button>
        </div>
      </form>

      {error && <div className="revenue-error">{error}</div>}

      {!hasRecharts && (
        <div className="revenue-warning">
          <p>⚠️ Recharts library not installed. Please run:</p>
          <code>npm install recharts</code>
          <p>Chart visualization will not be available until recharts is installed.</p>
        </div>
      )}

      {data && (
        <div className="revenue-results">
          <div className="revenue-summary-cards">
            <div className="revenue-summary-card revenue">
              <h3>Total Revenue</h3>
              <p className="revenue-value positive">{parseFloat(data.total_revenue || 0).toFixed(2)} TL</p>
            </div>
            <div className="revenue-summary-card cost">
              <h3>Total Cost</h3>
              <p className="revenue-value">{parseFloat(data.total_cost || 0).toFixed(2)} TL</p>
            </div>
            <div className="revenue-summary-card profit">
              <h3>Total Profit/Loss</h3>
              <p className={`revenue-value ${parseFloat(data.total_profit || 0) >= 0 ? 'positive' : 'negative'}`}>
                {parseFloat(data.total_profit || 0).toFixed(2)} TL
              </p>
            </div>
          </div>

          {hasRecharts && data.daily_data && data.daily_data.length > 0 && (
            <div className="revenue-chart-container">
              <h2>Daily Revenue & Profit Chart</h2>
              <p className="chart-description">
                📊 This chart displays daily revenue, cost, and profit/loss for the selected date range. 
                Hover over the data points on the chart to see detailed values.
              </p>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.daily_data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Amount (TL)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value) => `${parseFloat(value).toFixed(2)} TL`}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend 
                    wrapperStyle={{ cursor: 'default', pointerEvents: 'none' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Revenue (TL)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Cost (TL)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Profit (TL)"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!hasRecharts && data.daily_data && data.daily_data.length > 0 && (
            <div className="revenue-table-container">
              <h2>Daily Breakdown</h2>
              <table className="revenue-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Revenue (TL)</th>
                    <th>Cost (TL)</th>
                    <th>Profit (TL)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily_data.map((day, index) => (
                    <tr key={index}>
                      <td>{day.date}</td>
                      <td>{parseFloat(day.revenue || 0).toFixed(2)}</td>
                      <td>{parseFloat(day.cost || 0).toFixed(2)}</td>
                      <td className={parseFloat(day.profit || 0) >= 0 ? 'profit-positive' : 'profit-negative'}>
                        {parseFloat(day.profit || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {data && data.daily_data && data.daily_data.length === 0 && (
        <div className="revenue-empty">
          No data available for the selected date range.
        </div>
      )}
    </div>
  );
}

export default RevenueAnalysis;

