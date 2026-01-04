/**
 * API Client for connecting React frontend to Django backend
 * Base URL: http://localhost:8000/api/
 */

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Helper function to make API requests
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for session authentication
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // Try to parse JSON, but handle cases where response might not be JSON
    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      // If JSON parsing fails, create a basic error response
      data = { error: 'Invalid response from server' };
    }

    if (!response.ok) {
      // Handle error responses - preserve full error object
      const error = new Error(data.error || data.message || data.detail || 'An error occurred');
      error.response = { data, status: response.status };
      throw error;
    }

    return { data, status: response.status };
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error.response) {
      throw error;
    }
    // Handle network errors or other fetch errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('Unable to connect to server. Please make sure the backend is running.');
      networkError.response = { data: { error: 'Network error' }, status: 0 };
      throw networkError;
    }
    // Otherwise, wrap it
    console.error('API Request Error:', error);
    throw error;
  }
}

/**
 * Authentication API
 */
export const authAPI = {
  /**
   * Register a new user
   * @param {Object} userData - { username, email, password, password2, first_name, last_name }
   */
  async register(userData) {
    return apiRequest('/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  /**
   * Login user
   * @param {string} usernameOrEmail - Username or email
   * @param {string} password - Password
   */
  async login(usernameOrEmail, password) {
    return apiRequest('/login/', {
      method: 'POST',
      body: JSON.stringify({ username: usernameOrEmail, password }),
    });
  },

  /**
   * Logout user
   */
  async logout() {
    return apiRequest('/logout/', {
      method: 'POST',
    });
  },

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    return apiRequest('/user/');
  },

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   */
  async updateProfile(profileData) {
    return apiRequest('/user/profile/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  /**
   * Request password reset
   * @param {string} email - User email
   */
  async requestPasswordReset(email) {
    return apiRequest('/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Confirm password reset
   * @param {Object} resetData - { uid, token, new_password, new_password2 }
   */
  async confirmPasswordReset(resetData) {
    return apiRequest('/password-reset-confirm/', {
      method: 'POST',
      body: JSON.stringify(resetData),
    });
  },
};

/**
 * Helper to check if user is authenticated
 */
export async function checkAuth() {
  try {
    const response = await authAPI.getCurrentUser();
    return response.data;
  } catch (error) {
    return null;
  }
}

/**
 * Helper to store user data in localStorage (for frontend state management)
 */
export function storeUserData(user) {
  if (user) {
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('user_email', user.email || '');
    localStorage.setItem('user_name', `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username);
    localStorage.setItem('user_username', user.username);
    localStorage.setItem('is_authenticated', 'true');
    // Store admin status
    localStorage.setItem('is_admin', (user.is_admin || user.is_staff || user.is_superuser) ? 'true' : 'false');
    localStorage.setItem('is_staff', user.is_staff ? 'true' : 'false');
    localStorage.setItem('is_superuser', user.is_superuser ? 'true' : 'false');
  }
}

/**
 * Helper to clear user data from localStorage
 */
export function clearUserData() {
  localStorage.removeItem('user_id');
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_username');
  localStorage.removeItem('is_authenticated');
  localStorage.removeItem('is_admin');
  localStorage.removeItem('is_staff');
  localStorage.removeItem('is_superuser');
  // Clear cart items when user logs out
  localStorage.removeItem('cart_items');
}

/**
 * Cart API
 */
export const cartAPI = {
  /**
   * Get user's cart items
   */
  async getCart() {
    return apiRequest('/cart/');
  },

  /**
   * Add item to cart
   * @param {Object} itemData - { product_id, product_name, price, quantity, image_url, description }
   */
  async addToCart(itemData) {
    return apiRequest('/cart/add/', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  /**
   * Update cart item quantity
   * @param {number} itemId - Cart item ID
   * @param {number} quantity - New quantity
   */
  async updateCartItem(itemId, quantity) {
    return apiRequest(`/cart/item/${itemId}/`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  /**
   * Remove item from cart
   * @param {number} itemId - Cart item ID
   */
  async removeFromCart(itemId) {
    return apiRequest(`/cart/item/${itemId}/remove/`, {
      method: 'DELETE',
    });
  },

  /**
   * Clear all items from cart
   */
  async clearCart() {
    return apiRequest('/cart/clear/', {
      method: 'POST',
    });
  },

  /**
   * Merge local cart with user's account cart
   * @param {Array} localItems - Array of local cart items
   */
  async mergeCart(localItems) {
    return apiRequest('/cart/merge/', {
      method: 'POST',
      body: JSON.stringify({ items: localItems }),
    });
  },
};

/**
 * Wishlist API
 */
export const wishlistAPI = {
  /**
   * Get user's wishlist items
   */
  async getWishlist() {
    return apiRequest('/wishlist/');
  },

  /**
   * Add item to wishlist
   * @param {Object} itemData - { product_id, product_name, price, image_url, description }
   */
  async addToWishlist(itemData) {
    return apiRequest('/wishlist/add/', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  },

  /**
   * Remove item from wishlist
   * @param {number} itemId - Wishlist item ID
   */
  async removeFromWishlist(itemId) {
    return apiRequest(`/wishlist/item/${itemId}/remove/`, {
      method: 'DELETE',
    });
  },

  /**
   * Remove item from wishlist by product_id
   * @param {number} productId - Product ID
   */
  async removeFromWishlistByProduct(productId) {
    return apiRequest(`/wishlist/product/${productId}/remove/`, {
      method: 'DELETE',
    });
  },
};

/**
 * Product Manager API
 * Base URL: http://localhost:8000/ (root level, not under /api/)
 */
const PRODUCT_MANAGER_BASE_URL = 'http://localhost:8000';

async function productManagerRequest(endpoint, options = {}) {
  const url = `${PRODUCT_MANAGER_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  // If body is FormData, let the browser set the Content-Type header 
  // (which will include the boundary)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);

    // Try to parse JSON, but handle cases where response might not be JSON
    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (parseError) {
      // If JSON parsing fails, create a basic error response
      data = { error: 'Invalid response from server' };
    }

    if (!response.ok) {
      const error = new Error(data.error || data.message || data.detail || `Server error: ${response.status}`);
      error.response = { data, status: response.status };
      throw error;
    }

    return { data, status: response.status };
  } catch (error) {
    if (error.response) {
      throw error;
    }
    console.error('Product Manager API Request Error:', error);
    console.error('URL:', url);
    throw error;
  }
}

export const productManagerAPI = {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    return productManagerRequest('/dashboard/stats/');
  },

  /**
   * Get delivery department dashboard statistics
   */
  async getDeliveryDashboardStats() {
    return productManagerRequest('/delivery/dashboard/stats/');
  },

  /**
   * Get all products for management
   */
  async getManagerProducts() {
    return productManagerRequest('/products/');
  },

  /**
   * Get a single product by ID
   * @param {number} productId - Product ID
   */
  async getProduct(productId) {
    return productManagerRequest(`/products/${productId}/`);
  },

  /**
   * Create a new product
   * @param {Object} productData - Product data
   */
  async createProduct(productData) {
    const isFormData = productData instanceof FormData;
    return productManagerRequest('/products/', {
      method: 'POST',
      body: isFormData ? productData : JSON.stringify(productData),
    });
  },

  /**
   * Update a product
   * @param {number} productId - Product ID
   * @param {Object} productData - Updated product data
   */
  async updateProduct(productId, productData) {
    const isFormData = productData instanceof FormData;
    return productManagerRequest(`/products/${productId}/`, {
      method: 'PUT',
      body: isFormData ? productData : JSON.stringify(productData),
    });
  },

  /**
   * Delete a product
   * @param {number} productId - Product ID
   */
  async deleteProduct(productId) {
    return productManagerRequest(`/products/${productId}/`, {
      method: 'DELETE',
    });
  },

  /**
   * Get all categories
   */
  async getCategories() {
    return productManagerRequest('/categories/');
  },

  /**
   * Create a new category
   * @param {string} categoryName - Category name
   */
  async createCategory(categoryName) {
    return productManagerRequest('/categories/', {
      method: 'POST',
      body: JSON.stringify({ name: categoryName }),
    });
  },

  /**
   * Delete a category
   * @param {string} categoryName - Category name
   */
  async deleteCategory(categoryName) {
    return productManagerRequest(`/categories/${categoryName}/`, {
      method: 'DELETE',
    });
  },

  /**
   * Get stock information
   */
  async getStock() {
    return productManagerRequest('/stock/');
  },

  /**
   * Update stock quantity
   * @param {number} productId - Product ID
   * @param {number} quantity - New quantity
   */
  async updateStock(productId, quantity) {
    return productManagerRequest(`/stock/${productId}/`, {
      method: 'PUT',
      body: JSON.stringify({ quantity_in_stock: quantity }),
    });
  },

  /**
   * Get all orders
   * @param {string|null} statusFilter - Optional status filter
   */
  async getOrders(params = null) {
    let endpoint = '/orders/';

    if (params) {
      if (typeof params === 'string') {
        endpoint += `?status=${params}`;
      } else if (typeof params === 'object') {
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null) {
            queryParams.append(key, params[key]);
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          endpoint += `?${queryString}`;
        }
      }
    }
    return productManagerRequest(endpoint);
  },

  /**
   * Update order status
   * @param {string} deliveryId - Delivery ID
   * @param {string} newStatus - New status
   */
  async updateOrderStatus(deliveryId, newStatus) {
    return productManagerRequest(`/orders/${deliveryId}/status/`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });
  },

  /**
   * Get all comments/reviews
   * @param {string|null} statusFilter - Optional status filter (pending, approved, rejected)
   */
  async getComments(statusFilter = null) {
    const endpoint = statusFilter ? `/comments/?status=${statusFilter}` : '/comments/';
    return productManagerRequest(endpoint);
  },

  /**
   * Approve or reject a comment
   * @param {number} commentId - Comment ID
   * @param {string} action - 'approve' or 'reject'
   */
  async approveComment(commentId, action) {
    return productManagerRequest(`/comments/${commentId}/approve/`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
  },

  /**
   * Create a new review/comment
   * @param {Object} reviewData - { product_id, product_name, user_id, user_name, user_email, rating, comment }
   */
  async createReview(reviewData) {
    return productManagerRequest('/comments/create/', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  },

  /**
   * Get order history for a user
   * @param {string} email - User email
   */
  async getOrderHistory(email) {
    return productManagerRequest(`/orders/history/?email=${encodeURIComponent(email)}`);
  },
};

