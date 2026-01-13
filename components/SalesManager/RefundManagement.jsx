import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../api';
import './RefundManagement.css';

function RefundManagement() {
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [evaluationNotes, setEvaluationNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRefundRequests();
  }, [statusFilter]);

  const fetchRefundRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await productManagerAPI.getRefundRequests(statusFilter);
      setRefundRequests(response.data.refund_requests || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load refund requests');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (refundId, action) => {
    if (action === 'approve' && !evaluationNotes.trim()) {
      alert('Please provide evaluation notes');
      return;
    }

    setActionLoading(true);
    try {
      const userEmail = localStorage.getItem('user_email') || 'Sales Manager';
      await productManagerAPI.approveRefundRequest(
        refundId,
        action,
        evaluationNotes,
        userEmail
      );
      
      setSuccess(`Refund request ${action}ed successfully!`);
      setSelectedRequest(null);
      setEvaluationNotes('');
      fetchRefundRequests();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${action} refund request`);
      console.error('Error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusClass = (status) => {
    const statusMap = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'completed': 'status-completed',
    };
    return statusMap[status] || 'status-unknown';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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
    return <div className="refund-loading">Loading refund requests...</div>;
  }

  return (
    <div className="refund-management-container">
      <h1 className="refund-title">Refund Management</h1>

      {error && <div className="refund-error">{error}</div>}
      {success && <div className="refund-success">{success}</div>}

      <div className="refund-filters">
        <button
          className={`filter-btn ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => setStatusFilter('pending')}
        >
          Pending ({refundRequests.filter(r => r.status === 'pending').length})
        </button>
        <button
          className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          Approved
        </button>
        <button
          className={`filter-btn ${statusFilter === 'rejected' ? 'active' : ''}`}
          onClick={() => setStatusFilter('rejected')}
        >
          Rejected
        </button>
        <button
          className={`filter-btn ${statusFilter === '' ? 'active' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          All
        </button>
      </div>

      <div className="refund-requests-list">
        {refundRequests.length === 0 ? (
          <div className="refund-empty">No refund requests found.</div>
        ) : (
          refundRequests.map((request) => (
            <div key={request.id} className="refund-request-card">
              <div className="refund-card-header">
                <div>
                  <h3>Refund Request #{request.id}</h3>
                  <span className={`status-badge ${getStatusClass(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                <div className="refund-actions">
                  {request.status === 'pending' && (
                    <>
                      <button
                        className="action-btn approve-btn"
                        onClick={() => setSelectedRequest(request)}
                      >
                        Review
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="refund-card-body">
                <div className="refund-info-row">
                  <div className="info-item">
                    <span className="info-label">Order ID:</span>
                    <span className="info-value">{request.order_id}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Product:</span>
                    <span className="info-value">{request.product_name}</span>
                  </div>
                </div>

                <div className="refund-info-row">
                  <div className="info-item">
                    <span className="info-label">Quantity:</span>
                    <span className="info-value">{request.quantity}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Refund Amount:</span>
                    <span className="info-value amount">{formatCurrency(request.refund_amount)}</span>
                  </div>
                </div>

                <div className="refund-info-row">
                  <div className="info-item">
                    <span className="info-label">Customer:</span>
                    <span className="info-value">{request.customer_name} ({request.customer_email})</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Delivery Date:</span>
                    <span className="info-value">{request.delivery_date || 'N/A'}</span>
                  </div>
                </div>

                <div className="refund-reason">
                  <span className="info-label">Reason:</span>
                  <p>{request.reason}</p>
                </div>

                {request.evaluated_by && (
                  <div className="refund-evaluation">
                    <span className="info-label">Evaluated by:</span>
                    <p>{request.evaluated_by}</p>
                    {request.evaluation_notes && (
                      <>
                        <span className="info-label">Notes:</span>
                        <p>{request.evaluation_notes}</p>
                      </>
                    )}
                  </div>
                )}

                <div className="refund-timestamps">
                  <span>Requested: {formatDate(request.requested_at)}</span>
                  {request.evaluated_at && (
                    <span>Evaluated: {formatDate(request.evaluated_at)}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Evaluation Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Evaluate Refund Request</h2>
            <div className="evaluation-info">
              <p><strong>Order ID:</strong> {selectedRequest.order_id}</p>
              <p><strong>Product:</strong> {selectedRequest.product_name}</p>
              <p><strong>Quantity:</strong> {selectedRequest.quantity}</p>
              <p><strong>Refund Amount:</strong> {formatCurrency(selectedRequest.refund_amount)}</p>
              <p><strong>Customer:</strong> {selectedRequest.customer_name}</p>
              <p><strong>Reason:</strong> {selectedRequest.reason}</p>
            </div>

            <div className="form-group">
              <label>Evaluation Notes:</label>
              <textarea
                value={evaluationNotes}
                onChange={(e) => setEvaluationNotes(e.target.value)}
                placeholder="Enter your evaluation notes..."
                rows="4"
              />
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => {
                  setSelectedRequest(null);
                  setEvaluationNotes('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="reject-button"
                onClick={() => handleApproveReject(selectedRequest.id, 'reject')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Reject'}
              </button>
              <button
                className="approve-button"
                onClick={() => handleApproveReject(selectedRequest.id, 'approve')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RefundManagement;


