import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../product_manager_api';
import { productManagerAPI, wishlistAPI } from './api';
import {
  hasDeliveredProduct,
  hasReviewedProduct,
  hasRatedProduct,
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
  
  // Calculate stock status
  const isOutOfStock = product?.quantity_in_stock === 0;
  const isLowStock = product?.quantity_in_stock > 0 && product?.quantity_in_stock <= 3; // Low stock threshold: 3 or fewer units

  // Review & Rating state
  const [ratingType, setRatingType] = useState('stars'); // 'stars' or 'points'
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverValue, setHoverValue] = useState(0); // For star hover effect
  const [comment, setComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hasDelivered, setHasDelivered] = useState(false);
  const [userReviewStatus, setUserReviewStatus] = useState(null);

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

  const loadReviewsAndRatings = async () => {
    try {
      const productId = parseInt(id);

      const allCommentsResponse = await productManagerAPI.getComments(null); // Get all
      const allWebReviews = allCommentsResponse.data?.comments || [];

      // Filter for THIS product
      const productReviews = allWebReviews.filter(r =>
        (r.product_id === productId || r.productId === productId || r.product_id === String(productId))
      );

      // Calculate Stats
      // Calculate Stats
      // User requested ALL ratings to be counted instantly (Pending, Approved, Rejected)
      const activeReviews = productReviews;
      const totalCount = activeReviews.length;
      let totalSum = 0;
      activeReviews.forEach(r => {
        totalSum += Number(r.rating || 0);
      });

      const avg = totalCount > 0 ? (totalSum / totalCount).toFixed(1) : 0;

      setTotalRatings(totalCount);
      setAverageRating(parseFloat(avg));

      // Filter for Display: Only APPROVED status
      const visibleReviews = productReviews.filter(r => r.status === 'approved');

      const formattedReviews = visibleReviews.map(r => ({
        id: r.id,
        userName: r.user_name || r.userName || 'Anonymous',
        date: r.created_at || r.date,
        rating: r.rating,
        comment: r.comment
      }));

      setReviews(formattedReviews);

      // Review Permission Check
      if (productId && userId) {
        // Check "Delivered" status from backend to ensure consistency
        // local check: const hasDelivered = hasDeliveredProduct(userId, productId);
        // We will fetch orders for this user and product to check status
        let backendDelivered = false;
        try {
          const ordersResponse = await productManagerAPI.getOrders({
            email: userEmail,
            product_id: productId,
            status: 'delivered'
          });
          const userOrders = ordersResponse.data?.orders || [];
          if (userOrders.length > 0) {
            backendDelivered = true;
          }
        } catch (oErr) {
          console.error("Error checking orders:", oErr);
          // Fallback to local if API fails? Or safer to assume false?
          backendDelivered = hasDeliveredProduct(userId, productId);
        }

        const hasDelivered = backendDelivered;
        setHasDelivered(hasDelivered);

        const userReview = productReviews.find(r =>
          (r.user_id === String(userId) || r.user_id === userId || r.user_email === userEmail)
        );

        const alreadyReviewed = !!userReview;

        if (hasDelivered && !alreadyReviewed) {
          setShowReviewForm(true);
        } else {
          setShowReviewForm(false);
        }



        if (alreadyReviewed) {
          setRatingValue(userReview.rating);
          setSubmitted(false); // Do NOT show "submitted" message on load
          if (userReview) {
            setUserReviewStatus(userReview.status || 'pending');
          }
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
    setSubmissionError('');

    if (!ratingValue || ratingValue === 0) {
      setSubmissionError('Please provide a rating.');
      return;
    }

    if (!comment.trim()) {
      setSubmissionError('Please write a comment.');
      return;
    }

    const productId = parseInt(id);

    try {
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

      setTimeout(() => {
        loadReviewsAndRatings();
        setShowReviewForm(false);
        setSubmitted(false);
      }, 1500);

    } catch (err) {
      console.error('Error submitting review:', err);
      const errorMessage = err.response?.data?.error || 'Failed to submit review. Please try again.';
      setSubmissionError(errorMessage);
    }
  };

  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem('is_authenticated') === 'true';
    setIsAuthenticated(authStatus);
    if (authStatus && product) {
      checkWishlistStatus();
    }
  }, [product?.id]);

  const checkWishlistStatus = async () => {
    if (!product) return;
    try {
      const response = await wishlistAPI.getWishlist();
      const items = response.data.items || [];
      const found = items.some(item => item.product_id === product.id);
      setIsInWishlist(found);
    } catch (error) {
      setIsInWishlist(false);
    }
  };

  const handleAddToCart = () => {
    if (product.quantity_in_stock > 0) {
      addToCart(product, quantity);
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!product) return;

    try {
      if (isInWishlist) {
        await wishlistAPI.removeFromWishlistByProduct(product.id);
        setIsInWishlist(false);
      } else {
        await wishlistAPI.addToWishlist({
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          image_url: product.image_url || '',
          description: product.description || ''
        });
        setIsInWishlist(true);
      }
      
      // Dispatch custom event for wishlist update
      window.dispatchEvent(new CustomEvent('wishlistUpdated'));
    } catch (error) {
      console.error('Error updating wishlist:', error);
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
    const displayValue = interactive && hoverValue > 0 ? hoverValue : value;

    for (let i = 1; i <= maxStars; i++) {
      let isFilled = false;
      let fillPercentage = 0;

      if (interactive) {
        // Integer based for input
        isFilled = i <= displayValue;
        fillPercentage = isFilled ? 100 : 0;
      } else {
        // Fractional for display
        if (value >= i) {
          fillPercentage = 100;
          isFilled = true;
        } else if (value > i - 1) {
          fillPercentage = (value - (i - 1)) * 100;
          isFilled = true; // Still marked filled to apply gradient
        }
      }

      stars.push(
        <span
          key={i}
          className={`star ${isFilled ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          style={{ '--percent': `${fillPercentage}%` }}
          onClick={() => interactive && onChange && onChange(i)}
          onMouseEnter={() => interactive && setHoverValue(i)}
          onMouseLeave={() => interactive && setHoverValue(0)}
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

  if (loading) return <div className="product-detail-container"><div className="loading"><span>Loading product...</span></div></div>;
  if (error || !product) return <div className="product-detail-container"><div className="error-message">{error || 'Product not found.'}</div><button onClick={() => navigate('/products')} className="back-button">Back to Products</button></div>;

  const alreadyReviewed = userId && hasReviewedProduct(userId, product.id);
  const alreadyRated = userId && hasRatedProduct(userId, product.id);
  // Ensure showReviewSection is purely based on 'hasDelivered' and not reviewed. 
  // But generally we only show form if NOT reviewed.
  // The user requirement: "If not delivered, show error message".

  return (
    <div className="product-detail-container">
      <button onClick={() => navigate('/products')} className="back-button">← Back to Products</button>

      <div className="product-detail-content">
        <div className="product-detail-main">
          <div className="product-image-large">
            <img src={product.image_url || 'https://via.placeholder.com/500x500?text=Product'} alt={product.name} onError={(e) => { e.target.src = 'https://via.placeholder.com/500x500?text=Product'; }} />
          </div>
          <div className="product-info-detail">
            <h1 className="product-title">{product.name}</h1>
            <div className="product-meta">
              <span className="product-category-badge">{product.category}</span>
              {totalRatings > 0 && (
                <div className="product-rating-summary">
                  <span className="rating-stars-display">{renderStarRating(averageRating)}</span>
                  <span className="rating-text">{averageRating}/5 ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})</span>
                </div>
              )}
            </div>
            <p className="product-description-full">{product.description}</p>
            <div className="product-details-info">
              <div className="detail-row"><span className="detail-label">Model:</span><span className="detail-value">{product.model}</span></div>
              <div className="detail-row"><span className="detail-label">Serial Number:</span><span className="detail-value">{product.serial_number}</span></div>
              <div className="detail-row"><span className="detail-label">Warranty:</span><span className="detail-value">{product.warranty_status}</span></div>
              <div className="detail-row"><span className="detail-label">Distributor:</span><span className="detail-value">{product.distributor}</span></div>
              <div className="detail-row"><span className="detail-label">Price:</span><span className="detail-value price-value">₺{product.price.toFixed(2)}</span></div>
              <div className="detail-row"><span className="detail-label">In Stock:</span><span className={`detail-value ${product.quantity_in_stock === 0 ? 'out-of-stock' : ''}`}>{product.quantity_in_stock}</span></div>
            </div>
            <div className="product-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Cart Logic Same as Before */}
              <div className="quantity-selector" style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px' }}>
                <button onClick={decrementQuantity} style={{ padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} disabled={quantity <= 1}>−</button>
                <input type="number" value={quantity} readOnly style={{ width: '40px', textAlign: 'center', border: 'none', fontSize: '1rem', MozAppearance: 'textfield' }} />
                <button onClick={incrementQuantity} style={{ padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} disabled={quantity >= product.quantity_in_stock}>+</button>
              </div>
              <button 
                className="add-to-cart-button" 
                onClick={handleAddToCart} 
                disabled={isOutOfStock}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: isOutOfStock ? '#ccc' : '#4a90e2', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold', 
                  fontSize: '1rem',
                  opacity: isOutOfStock ? 0.6 : 1
                }}
              >
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button 
                className={`wishlist-button-detail ${isInWishlist ? 'active' : ''}`}
                onClick={handleWishlistToggle}
                title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                style={{ 
                  padding: '10px 15px', 
                  background: 'white', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isInWishlist ? '❤️' : '🤍'}
              </button>
              {isLowStock && product.quantity_in_stock > 0 && (
                <div className="low-stock-warning-detail" style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px', color: '#856404' }}>
                  ⚠️ Last {product.quantity_in_stock} {product.quantity_in_stock === 1 ? 'unit' : 'units'} remaining!
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="reviews-section">
          <h2>Reviews & Ratings</h2>
          {totalRatings > 0 ? (
            <div className="average-rating-display">
              <div className="avg-rating-main"><span className="avg-rating-value">{averageRating}</span><span className="avg-rating-max">/5</span></div>
              <div className="avg-rating-stars">{renderStarRating(averageRating)}</div>
              <p className="avg-rating-count">{totalRatings} ratings</p>
            </div>
          ) : (<p className="no-ratings">No ratings yet.</p>)}

          {/* Logic for showing form or error message */}
          {hasDelivered && !alreadyReviewed && !submitted && (
            <div className="review-form-container">
              <h3>Write a Review</h3>
              <form onSubmit={handleSubmitReview} className="review-form">
                <div className="rating-type-selector">
                  <label><input type="radio" value="stars" checked={ratingType === 'stars'} onChange={(e) => { setRatingType(e.target.value); setRatingValue(0); }} /> ⭐ Stars</label>
                  <label><input type="radio" value="points" checked={ratingType === 'points'} onChange={(e) => { setRatingType(e.target.value); setRatingValue(0); }} /> 🔢 Points</label>
                </div>
                <div className="rating-input">
                  <label>Your Rating:</label>
                  <div className="rating-display">
                    {ratingType === 'stars' ? renderStarRating(ratingValue, true, handleRatingChange) : renderPointRating(ratingValue, true, handleRatingChange)}
                    <span className="rating-value-text">{ratingValue > 0 ? `${ratingValue}/${ratingType === 'stars' ? 5 : 10}` : 'Select rating'}</span>
                  </div>
                </div>
                <div className="comment-input">
                  <label htmlFor="comment">Your Comment:</label>
                  <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." rows="5" required />
                  <small>Note: Your comment will be reviewed by a product manager before being published.</small>
                </div>
                {submissionError && <div className="error-message" style={{ color: 'red', marginTop: '10px' }}>{submissionError}</div>}
                <button type="submit" className="submit-review-btn">Submit Review</button>
              </form>
            </div>
          )}

          {submitted && (
            <div className="review-submitted-message">
              <p>✓ Your rating has been submitted!</p>
              <p>Your comment is pending approval and will be visible after review.</p>
            </div>
          )}

          {alreadyReviewed && !submitted && (
            <div className="already-reviewed-message">
              <p>You have already reviewed this product.</p>
              {userReviewStatus === 'pending' && <p><em>Status: Pending Approval</em></p>}
              {userReviewStatus === 'approved' && <p><em>Status: Approved</em></p>}
            </div>
          )}

          {/* Strict Message if NOT delivered */}
          {userId && !hasDelivered && (
            <div className="cannot-review-message" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px', color: '#856404' }}>
              <p>⚠️ <strong>Cannot Review:</strong> You can only rate and comment on products that you have personally purchased and received. Please wait until your order is delivered.</p>
            </div>
          )}

          {!userId && (
            <div className="login-required-message"><p>Please <button onClick={() => navigate('/login')} className="link-button">log in</button> to review products.</p></div>
          )}

          <div className="reviews-list">
            <h3>Customer Reviews ({reviews.length})</h3>
            {reviews.length === 0 ? <p className="no-reviews">No approved reviews yet.</p> : reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header"><span className="reviewer-name">{review.userName}</span><span className="review-date">{new Date(review.date).toLocaleDateString()}</span></div>
                <div className="review-rating">{review.rating && renderStarRating(review.rating)}</div>
                <p className="review-comment">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
