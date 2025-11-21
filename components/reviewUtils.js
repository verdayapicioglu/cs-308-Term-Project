// reviewUtils.js - Yorum ve puanlama yönetimi için utility fonksiyonları

const ORDERS_STORAGE_KEY = 'user_orders';
const REVIEWS_STORAGE_KEY = 'product_reviews';
const RATINGS_STORAGE_KEY = 'product_ratings';

// Sipariş yönetimi
export const getOrders = () => {
  const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Corrupted orders data. Resetting.', error);
    }
  }
  return [];
};

export const saveOrder = (order) => {
  const orders = getOrders();
  const newOrder = {
    ...order,
    id: order.id || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    orderDate: order.orderDate || new Date().toISOString(),
    status: order.status || 'processing',
  };
  orders.push(newOrder);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  return newOrder;
};

export const updateOrderStatus = (orderId, newStatus) => {
  const orders = getOrders();
  const updatedOrders = orders.map(order => {
    if (order.id === orderId) {
      return {
        ...order,
        status: newStatus,
        deliveryDate: newStatus === 'delivered' ? new Date().toISOString() : order.deliveryDate,
      };
    }
    return order;
  });
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
};

// Kullanıcının belirli bir ürünü satın alıp teslim edip etmediğini kontrol et
export const hasDeliveredProduct = (userId, productId) => {
  const orders = getOrders();
  return orders.some(order => 
    order.userId === userId && 
    order.status === 'delivered' &&
    order.items.some(item => item.productId === productId)
  );
};

// Kullanıcının belirli bir ürün için yorum yapıp yapmadığını kontrol et
export const hasReviewedProduct = (userId, productId) => {
  const reviews = getReviews();
  return reviews.some(review => 
    review.userId === userId && 
    review.productId === productId
  );
};

// Yorum yönetimi
export const getReviews = () => {
  const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Corrupted reviews data. Resetting.', error);
    }
  }
  return [];
};

export const getAllReviews = (statusFilter = null) => {
  const reviews = getReviews();
  if (statusFilter) {
    return reviews.filter(review => review.status === statusFilter);
  }
  return reviews;
};

export const getApprovedReviews = (productId) => {
  const reviews = getReviews();
  return reviews.filter(review => 
    review.productId === productId && 
    review.status === 'approved'
  );
};

export const saveReview = (review) => {
  const reviews = getReviews();
  const newReview = {
    ...review,
    id: review.id || `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: review.date || new Date().toISOString(),
    status: review.status || 'pending', // Yeni yorumlar onay bekler
  };
  reviews.push(newReview);
  localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  return newReview;
};

export const updateReviewStatus = (reviewId, newStatus) => {
  const reviews = getReviews();
  const updatedReviews = reviews.map(review => {
    if (review.id === reviewId) {
      return {
        ...review,
        status: newStatus,
      };
    }
    return review;
  });
  localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updatedReviews));
  return updatedReviews.find(r => r.id === reviewId);
};

// Puanlama yönetimi
export const getRatings = () => {
  const stored = localStorage.getItem(RATINGS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Corrupted ratings data. Resetting.', error);
    }
  }
  return [];
};

export const getProductRatings = (productId) => {
  const ratings = getRatings();
  return ratings.filter(rating => rating.productId === productId);
};

export const getAverageRating = (productId) => {
  const ratings = getProductRatings(productId);
  if (ratings.length === 0) return 0;
  // Normalize all ratings to 5-star scale for consistent display
  // Stars (1-5): use as is
  // Points (1-10): divide by 2 to get 1-5 scale
  const normalizedSum = ratings.reduce((acc, rating) => {
    if (rating.type === 'points') {
      // Convert 1-10 scale to 1-5 scale
      return acc + (rating.value / 2);
    } else {
      // Stars are already 1-5
      return acc + rating.value;
    }
  }, 0);
  return parseFloat((normalizedSum / ratings.length).toFixed(1));
};

export const saveRating = (rating) => {
  const ratings = getRatings();
  // Kullanıcı daha önce puanlama yaptıysa güncelle, yoksa yeni ekle
  const existingIndex = ratings.findIndex(
    r => r.userId === rating.userId && r.productId === rating.productId
  );
  
  const newRating = {
    ...rating,
    id: rating.id || `RAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: rating.date || new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    ratings[existingIndex] = newRating;
  } else {
    ratings.push(newRating);
  }
  
  localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings));
  return newRating;
};

// Kullanıcının belirli bir ürün için puan verip vermediğini kontrol et
export const hasRatedProduct = (userId, productId) => {
  const ratings = getRatings();
  return ratings.some(rating => 
    rating.userId === userId && 
    rating.productId === productId
  );
};

export const getUserRating = (userId, productId) => {
  const ratings = getRatings();
  return ratings.find(rating => 
    rating.userId === userId && 
    rating.productId === productId
  );
};