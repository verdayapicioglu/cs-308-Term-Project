import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import './ProductDetail.css';

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
      setError('');
      
      const productId = parseInt(id);
      
      // Try to fetch from backend API first
      try {
        const response = await productManagerAPI.getProduct(productId);
        const foundProduct = response.data;
        
        if (foundProduct) {
          // Map image based on product name/category
          let imageUrl = '';
          const nameLower = foundProduct.name.toLowerCase();
          if (nameLower.includes('cat') && nameLower.includes('salmon')) {
            imageUrl = '/images/cat-adult-salmon.jpeg';
          } else if (nameLower.includes('kitten') || (nameLower.includes('cat') && nameLower.includes('chicken'))) {
            imageUrl = '/images/kitten-chicken.jpeg';
          } else if (nameLower.includes('dog') && (nameLower.includes('lamb') || nameLower.includes('adult'))) {
            imageUrl = '/images/dog-adult-lamb.jpeg';
          } else if (nameLower.includes('puppy') || (nameLower.includes('dog') && nameLower.includes('chicken'))) {
            imageUrl = '/images/puppy-chicken.jpeg';
          } else {
            // Default image
            imageUrl = '/images/cat-adult-salmon.jpeg';
          }
          
          // Transform backend format to frontend format
          setProduct({
            id: foundProduct.id,
            name: foundProduct.name,
            description: foundProduct.description || '',
            price: parseFloat(foundProduct.price) || 0,
            category: foundProduct.category || '',
            quantity_in_stock: foundProduct.quantity_in_stock || 0,
            image_url: imageUrl,
            model: foundProduct.model || '',
            serial_number: foundProduct.serial_number || '',
            warranty_status: foundProduct.warranty_status || '',
            distributor: foundProduct.distributor || '',
          });
          setError('');
          return;
        }
      } catch (backendErr) {
        console.warn('Backend API failed, trying fallback:', backendErr);
      }
      
      // Fallback: Try frontend mock API
      try {
        const { productsAPI } = await import('../product_manager_api');
        const response = await productsAPI.getProducts({});
        const products = response.data || [];
        const foundProduct = products.find(p => p.id === productId);
        
        if (foundProduct) {
          setProduct(foundProduct);
          setError('');
        } else {
          setError('Product not found.');
        }
      } catch (fallbackErr) {
        setError('Failed to load product. Please try again.');
        console.error('Error fetching product:', fallbackErr);
      }
    } catch (err) {
      setError('Failed to load product. Please try again.');
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const loadReviewsAndRatings = async () => {
    const productId = parseInt(id);
    
    // Fetch approved reviews from backend
    try {
      const response = await productManagerAPI.getComments('approved');
      const allApprovedReviews = response.data.comments || [];
      const productReviews = allApprovedReviews.filter(
        review => review.product_id === productId || review.productId === productId
      );
      
      // Transform backend format to frontend format
      const transformedReviews = productReviews.map(review => ({
        id: review.id,
        productId: review.product_id || review.productId,
        productName: review.product_name || review.productName,
        userId: review.user_id || review.userId,
        userName: review.user_name || review.userName,
        userEmail: review.user_email || review.userEmail,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        date: review.date || review.created_at,
      }));
      
      setReviews(transformedReviews);
      
      // Calculate average rating from backend reviews
      if (transformedReviews.length > 0) {
        const avgRating = transformedReviews.reduce((sum, r) => sum + r.rating, 0) / transformedReviews.length;
        setAverageRating(parseFloat(avgRating.toFixed(1)));
        setTotalRatings(transformedReviews.length);
      } else {
        // Fallback to local ratings if no backend reviews
        const ratings = getProductRatings(productId);
        const avgRating = getAverageRating(productId);
        setTotalRatings(ratings.length);
        setAverageRating(parseFloat(avgRating));
      }
    } catch (err) {
      console.error('Error loading reviews from backend:', err);
      // Fallback to local reviews
      const approvedReviews = getApprovedReviews(productId);
      const ratings = getProductRatings(productId);
      const avgRating = getAverageRating(productId);
      
      setReviews(approvedReviews);
      setTotalRatings(ratings.length);
      setAverageRating(parseFloat(avgRating));
    }
    
    // Check if user can review - Only if product was purchased AND delivered
    if (productId && userId) {
      const hasDelivered = hasDeliveredProduct(userId, productId);
      const alreadyReviewed = hasReviewedProduct(userId, productId);
      const alreadyRated = hasRatedProduct(userId, productId);
      
      // Show review form only if:
      // 1. User purchased and received the product (delivered)
      // 2. User hasn't reviewed yet
      if (hasDelivered && !alreadyReviewed && !showReviewForm) {
        setShowReviewForm(true);
      }
      
      // Load user's existing rating if any
      if (alreadyRated) {
        const userRating = getUserRating(userId, productId);
        if (userRating) {
          setRatingValue(userRating.value);
          setRatingType(userRating.type || 'stars');
          setHoverValue(0);
        }
      }
    }
  };
  
  const handleRatingChange = (value) => {
    setRatingValue(value);
    setHoverValue(0); // Reset hover after selection
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
      // Save rating locally (immediate, no approval needed)
      saveRating({
        userId,
        userName,
        userEmail,
        productId,
        value: ratingType === 'stars' ? ratingValue : ratingValue / 2, // Convert points to stars for backend
        type: ratingType,
      });
      
      // Submit review to backend (needs approval)
      // Backend expects 1-5 star rating, so convert if needed
      const starRating = ratingType === 'stars' ? ratingValue : Math.round(ratingValue / 2);
      
      await productManagerAPI.createReview({
        product_id: productId,
        product_name: product?.name || '',
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        rating: starRating,
        comment: comment.trim(),
      });
      
      // Also save locally as backup
      saveReview({
        userId,
        userName,
        userEmail,
        productId,
        productName: product?.name || '',
        comment: comment.trim(),
        rating: starRating,
      });
      
      setSubmitted(true);
      setComment('');
      setRatingValue(0);
      setHoverValue(0);
      
      // Reload reviews and ratings
      setTimeout(() => {
        loadReviewsAndRatings();
        setShowReviewForm(false);
        setSubmitted(false);
      }, 1500);
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review. Please try again.');
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