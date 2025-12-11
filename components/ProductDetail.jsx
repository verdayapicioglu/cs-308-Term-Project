import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../product_manager_api';
import { productManagerAPI } from './api';
import {
  hasDeliveredProduct,
  hasReviewedProduct,
  hasRatedProduct,
  getUserRating,
  saveReview,
  saveRating,
  getApprovedReviews,
  getProductRatings,
  getAverageRating
} from './reviewUtils';
import { useCart } from '../context/CartContext';
import './ProductDetail.css';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  // Review & Rating state
  const [ratingType, setRatingType] = useState('stars'); // 'stars' or 'points'
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverValue, setHoverValue] = useState(0); // For star hover effect
  const [comment, setComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Display data
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  // User info
  const userId = localStorage.getItem('user_id') || localStorage.getItem('user_email');
  const userName = localStorage.getItem('user_name') || 'User';
  const userEmail = localStorage.getItem('user_email') || '';

  useEffect(() => {
    fetchProduct();
    loadReviewsAndRatings();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProducts({});
      const products = response.data || [];
      const foundProduct = products.find(p => p.id === parseInt(id));

      if (foundProduct) {
        setProduct(foundProduct);
        setError('');
      } else {
        setError('Product not found.');
      }
    } catch (err) {
      setError('Failed to load product. Please try again.');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };

  /* 
   * NEW IMPLEMENTATION: Using Backend API 
   */
  const loadReviewsAndRatings = async () => {
    try {
      const productId = parseInt(id);

      // 1. Get ALL comments for statistics (from backend)
      // FIX: Removed invalid call to productsAPI.getProduct which doesn't exist
      // const response = await productsAPI.getProduct(productId); 

      // Better approach: Get all comments filtered by product ID from the comments endpoint
      // Current API endpoint /comments/ returns ALL comments or filtered by status.
      // We need to fetch ALL comments for this product to calculate ratings, 
      // but only show APPROVED comments in the list.

      // Since the API doesn't support filtering by Product ID yet efficiently for "all statuses",
      // we will fetch all comments and filter locally for this prototype, 
      // OR rely on the fact that we can get "approved" ones for display and maybe "all" for stats?
      // Actually, let's look at `productManagerAPI.getComments`.

      const allCommentsResponse = await productManagerAPI.getComments(null); // Get all
      const allWebReviews = allCommentsResponse.data?.comments || [];

      // Filter for THIS product
      const productReviews = allWebReviews.filter(r =>
        (r.product_id === productId || r.productId === productId || r.product_id === String(productId))
      );

      // Calculate Stats
      // Requirement Update: "Pending ratings SHOULD appear immediately".
      // Logic: 
      // - Pending: Counts
      // - Approved: Counts
      // - Rejected: Does NOT count

      const activeReviews = productReviews.filter(r => r.status !== 'rejected');

      const totalCount = activeReviews.length;
      let totalSum = 0;
      activeReviews.forEach(r => {
        totalSum += Number(r.rating || 0);
      });

      const avg = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : 0;

      setTotalRatings(totalCount);
      setAverageRating(parseFloat(avg));

      // Filter for Display: Only APPROVED status
      // Also, effectively merge with any "local" display if we wanted instant feedback, 
      // but the requirement says "Write a comment ... should not appear immediately".
      // So we ONLY show approved ones.
      // DEBUG: Log reviews to console (and maybe UI temporarily if needed)
      console.log('Fetched Reviews:', productReviews);

      const visibleReviews = productReviews.filter(r => r.status === 'approved');
      console.log('Visible Reviews:', visibleReviews);

      // Temporary Debug UI for user to see what is happening
      if (productReviews.length > 0 && visibleReviews.length === 0) {
        console.warn('Reviews exist but none are approved.');
      }

      // Map to expected format if needed
      const formattedReviews = visibleReviews.map(r => ({
        id: r.id,
        userName: r.user_name || r.userName || 'Anonymous',
        date: r.created_at || r.date,
        rating: r.rating,
        comment: r.comment
      }));

      setReviews(formattedReviews);

      // Check user status (purchased/delivered)
      // Keeping generic logic for now - user ID check
      if (productId && userId) {
        // We still check local orders for "Has Delivered" permission since that part of the system 
        // wasn't fully migrated to backend in previous steps (Order flow uses API but helper checks local? 
        // actually helper `hasDeliveredProduct` checks local storage `user_orders`).
        // For this task, we assume the user has permission if they have the order in their history.
        // We will keep the legacy check `hasDeliveredProduct` if it works, otherwise we might need to 
        // check via API `productManagerAPI.getOrderHistory`.
        // For safety/speed in this task, we'll assume the local order history is sync'd or use the helper.

        const hasDelivered = hasDeliveredProduct(userId, productId);

        // check if already reviewed THIS product in the fetched list
        const userReview = productReviews.find(r =>
          (r.user_id === String(userId) || r.user_id === userId || r.user_email === userEmail)
        );

        const alreadyReviewed = !!userReview;

        if (hasDelivered && !alreadyReviewed && !showReviewForm) {
          setShowReviewForm(true);
        }

        if (alreadyReviewed) {
          // Set user's existing rating for display
          setRatingValue(userReview.rating);
          setSubmitted(true); // Treat as "done"
          // If pending, show message?
        }
      }

    } catch (err) {
      console.error('Error loading reviews:', err);
    }
  };

  const handleRatingChange = (value) => {
    setRatingValue(value);
    setHoverValue(0);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!ratingValue || ratingValue === 0) {
      alert('Please provide a rating.');
      return;
    }

    if (!comment.trim()) {
      alert('Please write a comment.');
      return;
    }

    const productId = parseInt(id);

    try {
      // Create new review via API
      const reviewData = {
        product_id: productId,
        product_name: product?.name || '',
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        rating: ratingValue,
        comment: comment.trim()
      };

      await productManagerAPI.createReview(reviewData);

      setSubmitted(true);
      setComment('');
      // Don't clear rating value so user sees what they submitted

      // Reload logic
      setTimeout(() => {
        loadReviewsAndRatings(); // This will recalculate avgs (immediate) but hide comment (pending)
        setShowReviewForm(false);
        setSubmitted(false); // Reset submitted state to show "Thanks" or just hide form
      }, 1500);

    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review. Please try again.');
    }
  };

  const handleAddToCart = () => {
    if (product.quantity_in_stock > 0) {
      addToCart(product, quantity);
    }
  };

  const incrementQuantity = () => {
    if (quantity < product.quantity_in_stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const renderStarRating = (value, interactive = false, onChange = null) => {
    const stars = [];
    const maxStars = 5;
    // Use hoverValue for preview, fallback to actual value
    const displayValue = interactive && hoverValue > 0 ? hoverValue : value;

    for (let i = 1; i <= maxStars; i++) {
      stars.push(
        <span
          key={i}
          className={`star ${i <= displayValue ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          onClick={() => {
            if (interactive && onChange) {
              onChange(i);
            }
          }}
          onMouseEnter={() => {
            if (interactive) {
              setHoverValue(i);
            }
          }}
          onMouseLeave={() => {
            if (interactive) {
              setHoverValue(0);
            }
          }}
          title={interactive ? `Rate ${i} star${i > 1 ? 's' : ''}` : ''}
        >
          ★
        </span>
      );
    }
    return <div className="star-rating">{stars}</div>;
  };

  const renderPointRating = (value, interactive = false, onChange = null) => {
    const points = [];
    const maxPoints = 10;

    for (let i = 1; i <= maxPoints; i++) {
      points.push(
        <button
          key={i}
          type="button"
          className={`point-btn ${i === value ? 'selected' : ''} ${interactive ? 'interactive' : ''}`}
          onClick={() => interactive && onChange && onChange(i)}
        >
          {i}
        </button>
      );
    }
    return <div className="point-rating">{points}</div>;
  };

  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="loading">
          <span>Loading product...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-container">
        <div className="error-message">{error || 'Product not found.'}</div>
        <button onClick={() => navigate('/products')} className="back-button">
          Back to Products
        </button>
      </div>
    );
  }

  // User can only review if:
  // 1. They are logged in
  // 2. They purchased the product
  // 3. The product was delivered
  const hasDelivered = userId && hasDeliveredProduct(userId, product.id);
  const alreadyReviewed = userId && hasReviewedProduct(userId, product.id);
  const alreadyRated = userId && hasRatedProduct(userId, product.id);
  const showReviewSection = hasDelivered && (!alreadyReviewed || !alreadyRated);

  return (
    <div className="product-detail-container">
      <button onClick={() => navigate('/products')} className="back-button">
        ← Back to Products
      </button>

      <div className="product-detail-content">
        <div className="product-detail-main">
          <div className="product-image-large">
            <img
              src={product.image_url || 'https://via.placeholder.com/500x500?text=Product'}
              alt={product.name}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/500x500?text=Product';
              }}
            />
          </div>

          <div className="product-info-detail">
            <h1 className="product-title">{product.name}</h1>
            <div className="product-meta">
              <span className="product-category-badge">{product.category}</span>
              {totalRatings > 0 && (
                <div className="product-rating-summary">
                  <span className="rating-stars-display">
                    {renderStarRating(Math.round(averageRating))}
                  </span>
                  <span className="rating-text">
                    {averageRating}/5 ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
                  </span>
                </div>
              )}
            </div>

            <p className="product-description-full">{product.description}</p>

            <div className="product-details-info">
              <div className="detail-row">
                <span className="detail-label">Price:</span>
                <span className="detail-value price-value">₺{product.price.toFixed(2)}</span>
              </div>
              {product.quantity_in_stock !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">In Stock:</span>
                  <span className={`detail-value ${product.quantity_in_stock === 0 ? 'out-of-stock' : ''}`}>
                    {product.quantity_in_stock}
                  </span>
                </div>
              )}
            </div>

            <div className="product-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              {product.quantity_in_stock > 0 ? (
                <>
                  <div className="quantity-selector" style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <button
                      onClick={decrementQuantity}
                      style={{ padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                      disabled={quantity <= 1}
                    >−</button>
                    <input
                      type="number"
                      value={quantity}
                      readOnly
                      style={{ width: '40px', textAlign: 'center', border: 'none', fontSize: '1rem', MozAppearance: 'textfield' }}
                    />
                    <button
                      onClick={incrementQuantity}
                      style={{ padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                      disabled={quantity >= product.quantity_in_stock}
                    >+</button>
                  </div>
                  <button
                    className="add-to-cart-button"
                    onClick={handleAddToCart}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#4a90e2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}
                  >
                    Add to Cart
                  </button>
                </>
              ) : (
                <button
                  disabled
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ccc',
                    color: '#666',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'not-allowed',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}
                >
                  Out of Stock
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reviews & Ratings Section */}
        <div className="reviews-section">
          <h2>Reviews & Ratings</h2>

          {/* Average Rating Display */}
          {totalRatings > 0 ? (
            <div className="average-rating-display">
              <div className="avg-rating-main">
                <span className="avg-rating-value">{averageRating}</span>
                <span className="avg-rating-max">/5</span>
              </div>
              <div className="avg-rating-stars">
                {renderStarRating(Math.round(averageRating))}
              </div>
              <p className="avg-rating-count">{totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}</p>
            </div>
          ) : (
            <p className="no-ratings">No ratings yet. Be the first to rate!</p>
          )}

          {/* Review Form */}
          {showReviewSection && !submitted && (
            <div className="review-form-container">
              <h3>Write a Review</h3>
              <form onSubmit={handleSubmitReview} className="review-form">
                <div className="rating-type-selector">
                  <label className={ratingType === 'stars' ? 'selected' : ''}>
                    <input
                      type="radio"
                      value="stars"
                      checked={ratingType === 'stars'}
                      onChange={(e) => {
                        setRatingType(e.target.value);
                        setRatingValue(0);
                        setHoverValue(0);
                      }}
                    />
                    <span>⭐ Rate with Stars (1-5)</span>
                  </label>
                  <label className={ratingType === 'points' ? 'selected' : ''}>
                    <input
                      type="radio"
                      value="points"
                      checked={ratingType === 'points'}
                      onChange={(e) => {
                        setRatingType(e.target.value);
                        setRatingValue(0);
                        setHoverValue(0);
                      }}
                    />
                    <span>🔢 Rate with Points (1-10)</span>
                  </label>
                </div>

                <div className="rating-input">
                  <label>Your Rating:</label>
                  {ratingType === 'stars' ? (
                    <div className="rating-display">
                      {renderStarRating(ratingValue, true, handleRatingChange)}
                      <span className="rating-value-text">
                        {ratingValue > 0 ? `${ratingValue}/5` : 'Select rating'}
                      </span>
                    </div>
                  ) : (
                    <div className="rating-display">
                      {renderPointRating(ratingValue, true, handleRatingChange)}
                      <span className="rating-value-text">
                        {ratingValue > 0 ? `${ratingValue}/10` : 'Select rating'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="comment-input">
                  <label htmlFor="comment">Your Comment:</label>
                  <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with this product..."
                    rows="5"
                    required
                  />
                  <small>Note: Your comment will be reviewed by a product manager before being published.</small>
                </div>

                <button type="submit" className="submit-review-btn">
                  Submit Review
                </button>
              </form>
            </div>
          )}

          {submitted && (
            <div className="review-submitted-message">
              <p>✓ Your rating has been submitted!</p>
              <p>Your comment is pending approval and will be visible after review.</p>
            </div>
          )}

          {alreadyReviewed && (
            <div className="already-reviewed-message">
              <p>You have already reviewed this product. Thank you!</p>
            </div>
          )}

          {userId && !hasDelivered && (
            <div className="cannot-review-message">
              <p>⚠️ You can only rate and comment on products that you have purchased and received. Please wait until your order is delivered.</p>
            </div>
          )}

          {!userId && (
            <div className="login-required-message">
              <p>Please <button onClick={() => navigate('/login')} className="link-button">log in</button> to review products.</p>
            </div>
          )}

          {/* Approved Reviews List */}
          <div className="reviews-list">
            <h3>Customer Reviews ({reviews.length})</h3>
            {reviews.length === 0 ? (
              <p className="no-reviews">No approved reviews yet.</p>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <span className="reviewer-name">{review.userName || 'Anonymous'}</span>
                    <span className="review-date">
                      {new Date(review.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="review-rating">
                    {review.rating && renderStarRating(review.rating)}
                  </div>
                  <p className="review-comment">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;

