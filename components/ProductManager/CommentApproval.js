import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../../api';
import './CommentApproval.css';

function CommentApproval() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  useEffect(() => {
    fetchComments();
  }, [statusFilter]);

  const fetchComments = async () => {
    try {
      const response = await productManagerAPI.getComments(statusFilter || null);
      setComments(response.data.comments || []);
      setError('');
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (commentId, action) => {
    try {
      await productManagerAPI.approveComment(commentId, action);
      await fetchComments();
      setError('');
    } catch (err) {
      setError('Failed to update comment status');
      console.error('Error:', err);
    }
  };

  const getRatingStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) {
    return <div className="ca-loading">Loading comments...</div>;
  }

  return (
    <div className="comment-approval-container">
      <div className="ca-header">
        <h1>Comment Approval</h1>
        <div className="filter-controls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="">All Comments</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && <div className="ca-error">{error}</div>}

      <div className="comments-grid">
        {comments.map((comment) => (
          <div key={comment.id} className="comment-card">
            <div className="comment-header">
              <div className="comment-product">
                <strong>{comment.product_name}</strong>
              </div>
              <span className={`comment-status ${comment.status}`}>
                {comment.status}
              </span>
            </div>

            <div className="comment-rating">
              <span className="rating-stars">{getRatingStars(comment.rating)}</span>
              <span className="rating-value">({comment.rating}/5)</span>
            </div>

            <div className="comment-text">
              "{comment.comment}"
            </div>

            <div className="comment-meta">
              <div className="comment-author">
                <strong>{comment.customer_name}</strong>
                <span className="comment-email">{comment.customer_email}</span>
              </div>
              <div className="comment-date">
                Submitted: {comment.submitted_date}
              </div>
            </div>

            {comment.status === 'pending' && (
              <div className="comment-actions">
                <button
                  className="btn-approve"
                  onClick={() => handleApprove(comment.id, 'approve')}
                >
                  ✓ Approve
                </button>
                <button
                  className="btn-reject"
                  onClick={() => handleApprove(comment.id, 'reject')}
                >
                  ✗ Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {comments.length === 0 && (
        <div className="no-comments">No comments found.</div>
      )}
    </div>
  );
}

export default CommentApproval;


