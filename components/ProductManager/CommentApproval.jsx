import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../api';
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

      // Build endpoint with status filter
      const endpoint = statusFilter ? `/comments/?status=${statusFilter}` : '/comments/';
      // Handle empty string as null for "All Comments"
      const filterValue = statusFilter === '' ? null : statusFilter;
      const response = await productManagerAPI.getComments(filterValue);

      console.log('API Response:', response); // Debug log
      console.log('Status Filter:', statusFilter, 'Filter Value:', filterValue); // Debug log

      const commentsData = response?.data?.comments || [];

      console.log('Comments data:', commentsData); // Debug log

      // Sort by date - newest first
      commentsData.sort((a, b) => {
        const dateA = new Date(a.date || a.created_at || 0);
        const dateB = new Date(b.date || b.created_at || 0);
        return dateB - dateA;
      });

      setComments(commentsData);

      // Load stats (get all comments without filter)
      const allResponse = await productManagerAPI.getComments(null);
      const allComments = allResponse?.data?.comments || [];
      setStats({
        pending: allComments.filter(c => c.status === 'pending').length,
        approved: allComments.filter(c => c.status === 'approved').length,
        rejected: allComments.filter(c => c.status === 'rejected').length,
        total: allComments.length
      });
    } catch (err) {
      setError(`Failed to load comments: ${err.message || err}`);
      console.error('Error loading comments:', err);
      console.error('Error details:', err.response || err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (commentId, action) => {
    try {
      await productManagerAPI.approveComment(commentId, action);
      setMessage(`Comment ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
      // Force reload to ensure everything is synced
      window.location.reload();
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

  return (
    <div className="comment-approval-container">
      <div className="ca-header">
        <div>
          <h1>Comment Approval Management</h1>
          <p className="ca-subtitle">Review and approve customer comments</p>
        </div>
        {stats.pending > 0 && (
          <div className="pending-badge">
            <span className="pending-count">{stats.pending}</span>
            <span className="pending-text">Pending Review{stats.pending !== 1 ? 's' : ''}</span>
          </div>
        )}
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
            <option value="pending">Pending ({stats.pending || 0})</option>
            <option value="approved">Approved ({stats.approved || 0})</option>
            <option value="rejected">Rejected ({stats.rejected || 0})</option>
          </select>
        </div>
      </div>

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="ca-error">
          {error}
          <br />
          <small>Check browser console for details</small>
        </div>
      )}

      <div className="comments-stats">
        <div className="stat-card pending-stat" onClick={() => setStatusFilter('pending')}>
          <span className="stat-label">Pending</span>
          <span className="stat-value">{stats.pending}</span>
        </div>
        <div className="stat-card approved-stat" onClick={() => setStatusFilter('approved')}>
          <span className="stat-label">Approved</span>
          <span className="stat-value">{stats.approved}</span>
        </div>
        <div className="stat-card rejected-stat" onClick={() => setStatusFilter('rejected')}>
          <span className="stat-label">Rejected</span>
          <span className="stat-value">{stats.rejected}</span>
        </div>
        <div className="stat-card total-stat" onClick={() => setStatusFilter('')}>
          <span className="stat-label">Total</span>
          <span className="stat-value">{stats.total}</span>
        </div>
      </div>

      <div className="comments-grid">
        {comments.length === 0 && !loading ? (
          <div className="no-comments">
            <div className="no-comments-icon">💬</div>
            <h3>No comments found</h3>
            <p>
              {statusFilter
                ? `No ${statusFilter} comments at the moment.`
                : 'No comments have been submitted yet.'}
            </p>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
              Debug: Filter = "{statusFilter}", Comments array length = {comments.length}
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={`comment-card ${comment.status}`}>
              <div className="comment-header">
                <div className="comment-product">
                  <span className="product-icon">📦</span>
                  <div>
                    <strong>{comment.productName || comment.product_name || 'Unknown Product'}</strong>
                    <span className="product-id">Product ID: {comment.productId || comment.product_id}</span>
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
                      <strong>{comment.userName || comment.user_name || 'Anonymous'}</strong>
                      <span className="comment-email">{comment.userEmail || comment.user_email || 'N/A'}</span>
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
  );
}

export default CommentApproval;

