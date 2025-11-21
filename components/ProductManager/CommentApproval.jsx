import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../api.js';
import './CommentApproval.css';

function CommentApproval() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  useEffect(() => {
    loadComments();
  }, [statusFilter]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await productManagerAPI.getComments(statusFilter || null);
      const allComments = response.data.comments || [];
      
      // Sort by date - newest first
      allComments.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
      setComments(allComments);
      
      // Update stats
      const allResponse = await productManagerAPI.getComments();
      const all = allResponse.data.comments || [];
      setStats({
        pending: all.filter(c => c.status === 'pending').length,
        approved: all.filter(c => c.status === 'approved').length,
        rejected: all.filter(c => c.status === 'rejected').length,
        total: all.length,
      });
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (commentId, action) => {
    try {
      setError('');
      await productManagerAPI.approveComment(commentId, action);
      setMessage(`Comment ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setTimeout(() => setMessage(''), 3000);
      loadComments(); // Reload comments
    } catch (err) {
      setError('Failed to update comment status');
      console.error('Error:', err);
    }
  };

  const renderStarRating = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'star filled' : 'star'}>
          ★
        </span>
      );
    }
    return <div className="star-rating">{stars}</div>;
  };

  if (loading) {
    return (
      <div className="comment-approval-container">
        <div className="ca-loading">
          <div className="loading-spinner"></div>
          <p>Loading comments...</p>
        </div>
      </div>
    );
  }

  const pendingCount = stats.pending;

  return (
    <div className="comment-approval-container">
      <div className="ca-main-card">
        <div className="ca-header">
          <div className="ca-title-section">
            <h1>
              <span className="ca-icon">💬</span>
              Comment Approval Management
            </h1>
            <p className="ca-subtitle">Review and approve customer comments</p>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-controls">
            <label htmlFor="status-filter">Filter by Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="">All Comments</option>
              <option value="pending">Pending ({stats.pending})</option>
              <option value="approved">Approved ({stats.approved})</option>
              <option value="rejected">Rejected ({stats.rejected})</option>
            </select>
          </div>
        </div>

        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && <div className="ca-error">{error}</div>}

        <div className="comments-stats">
          <div className="stat-card pending-stat">
            <span className="stat-label">PENDING</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
          <div className="stat-card approved-stat">
            <span className="stat-label">APPROVED</span>
            <span className="stat-value">{stats.approved}</span>
          </div>
          <div className="stat-card rejected-stat">
            <span className="stat-label">REJECTED</span>
            <span className="stat-value">{stats.rejected}</span>
          </div>
        </div>

        <div className="comments-grid">
          {comments.length === 0 ? (
            <div className="no-comments">
              <div className="no-comments-icon">💬</div>
              <h3>No comments found</h3>
              <p>
                {statusFilter 
                  ? `No ${statusFilter} comments at the moment.` 
                  : 'No comments have been submitted yet.'}
              </p>
            </div>
          ) : (
          comments.map((comment) => (
            <div key={comment.id} className={`comment-card ${comment.status}`}>
              <div className="comment-header">
                <div className="comment-product">
                  <span className="product-icon">📦</span>
                  <div>
                    <strong>{comment.product_name || comment.productName || 'Unknown Product'}</strong>
                    <span className="product-id">Product ID: {comment.product_id || comment.productId}</span>
                  </div>
                </div>
                <span className={`comment-status ${comment.status}`}>
                  {comment.status === 'pending' && '⏳ Pending'}
                  {comment.status === 'approved' && '✓ Approved'}
                  {comment.status === 'rejected' && '✗ Rejected'}
                </span>
              </div>

              <div className="comment-rating-section">
                <label>Rating:</label>
                {renderStarRating(comment.rating || 0)}
                <span className="rating-value-text">({comment.rating || 0}/5)</span>
              </div>

              <div className="comment-text">
                <div className="comment-quote">"</div>
                <p>{comment.comment}</p>
                <div className="comment-quote-end">"</div>
              </div>

              <div className="comment-meta">
                <div className="comment-author">
                  <div className="author-info">
                    <span className="author-icon">👤</span>
                    <div>
                      <strong>{comment.user_name || comment.userName || 'Anonymous'}</strong>
                      <span className="comment-email">{comment.user_email || comment.userEmail || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="comment-date">
                  <span className="date-icon">📅</span>
                  Submitted: {new Date(comment.date || comment.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {comment.status === 'pending' && (
                <div className="comment-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(comment.id, 'approve')}
                    title="Approve this comment"
                  >
                    ✓ Approve Comment
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleApprove(comment.id, 'reject')}
                    title="Reject this comment"
                  >
                    ✗ Reject Comment
                  </button>
                </div>
              )}

              {comment.status === 'approved' && (
                <div className="comment-status-message approved-message">
                  ✓ This comment is visible to customers
                </div>
              )}

              {comment.status === 'rejected' && (
                <div className="comment-status-message rejected-message">
                  ✗ This comment has been rejected and is not visible to customers
                </div>
              )}
            </div>
          ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CommentApproval;

