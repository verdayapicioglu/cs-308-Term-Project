import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { cartAPI } from "../components/api";

const CartContext = createContext(null);
const STORAGE_KEY = "cart_items";

const saveToStorage = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const getMaxQuantity = (product) => {
  if (!product || product.quantity_in_stock === undefined || product.quantity_in_stock === null) {
    return null;
  }
  const parsed = Number(product.quantity_in_stock);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.max(0, parsed);
};

const generateCartId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cart-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => readFromStorage());
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('user_id'));

  const [notification, setNotification] = useState("");
  const [notificationTimer, setNotificationTimer] = useState(null);

  const loadCartFromBackend = async () => {
    try {
      const response = await cartAPI.getCart();
      if (response.data && response.data.items) {
        // Convert backend cart items to local format
        // IMPORTANT: Save cart_item_id (item.id) to sync with backend
        const backendItems = response.data.items.map(item => ({
          id: item.product_id, // product_id for frontend compatibility
          cart_item_id: item.id, // Backend CartItem ID for API calls
          name: item.product_name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          image_url: item.image_url || '',
          description: item.description || '',
          maxQuantity: null // Will be set when adding items
        }));
        setCartItems(backendItems);
      }
    } catch (error) {
      // If user is not authenticated or cart doesn't exist, that's fine
      console.log('Could not load cart from backend:', error);
    }
  };

  useEffect(() => {
    saveToStorage(cartItems);
  }, [cartItems]);

  // Clear cart when user changes (login/logout) - on mount
  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
    
    // If user changed (different user_id) or logged out, clear local cart
    if (currentUserId !== userId || (!isAuthenticated && currentUserId !== null)) {
      setCartItems([]);
      setCurrentUserId(userId);
      
      // If new user logged in, load their cart from backend
      if (isAuthenticated && userId) {
        loadCartFromBackend();
      }
    } else if (isAuthenticated && userId && currentUserId === userId) {
      // Same user, make sure cart is synced with backend
      loadCartFromBackend();
    }
  }, []);

  // Listen for storage changes (user login/logout)
  useEffect(() => {
    const handleStorageChange = () => {
      const userId = localStorage.getItem('user_id');
      const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
      
      if (currentUserId !== userId) {
        // User changed, clear cart
        setCartItems([]);
        setCurrentUserId(userId);
        
        // If new user logged in, load their cart from backend
        if (isAuthenticated && userId) {
          loadCartFromBackend();
        }
      } else if (!isAuthenticated && currentUserId !== null) {
        // User logged out, clear cart
        setCartItems([]);
        setCurrentUserId(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check on focus (for same-tab login/logout)
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, [currentUserId]);

  const showNotification = (message) => {
    if (notificationTimer) {
      clearTimeout(notificationTimer);
    }
    setNotification(message);
    const timer = setTimeout(() => {
      setNotification("");
    }, 3000);
    setNotificationTimer(timer);
  };


  // CartContext.jsx içindeki addToCart fonksiyonunu bununla değiştirin:

  /* 
     Update to fix stock validation issues:
     - Ensure getMaxQuantity returns a valid number or null.
     - Strictly enforce stock limits in addToCart and updateQuantity.
     - Handle cases where product object might be incomplete.
  */

  const addToCart = async (product, quantity = 1) => {
    if (!product) return;

    let currentItems = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      currentItems = stored ? JSON.parse(stored) : [];
    } catch (e) {
      currentItems = [];
    }

    // Ensure we have a valid max quantity
    const maxQuantity = getMaxQuantity(product);

    // Find existing item
    const existingIndex = currentItems.findIndex((item) => item.id === product.id);

    // If item exists, use its stored maxQuantity if available, otherwise use the new one
    // This is important because the product object passed here might be partial
    let effectiveMaxQty = maxQuantity;
    if (existingIndex > -1 && (effectiveMaxQty === null || effectiveMaxQty === undefined)) {
      effectiveMaxQty = currentItems[existingIndex].maxQuantity;
    }

    if (effectiveMaxQty === 0) {
      showNotification(`${product.name} is out of stock.`);
      return;
    }

    if (existingIndex > -1) {
      const existingItem = currentItems[existingIndex];
      const currentQty = Number(existingItem.quantity) || 0;
      const nextQuantity = currentQty + quantity;

      if (effectiveMaxQty !== null && effectiveMaxQty !== undefined && nextQuantity > effectiveMaxQty) {
        showNotification(`Only ${effectiveMaxQty} unit(s) of ${product.name} available.`);
        return;
      }

      currentItems[existingIndex] = {
        ...existingItem,
        quantity: nextQuantity,
        // Update maxQuantity if we have a fresh valid one
        maxQuantity: effectiveMaxQty !== null ? effectiveMaxQty : existingItem.maxQuantity
      };

      showNotification(`${product.name} quantity updated.`);
    } else {
      currentItems.push({
        id: product.id ?? generateCartId(),
        name: product.name,
        price: product.price ?? 0,
        quantity: quantity,
        image_url: product.image_url,
        description: product.description,
        maxQuantity: effectiveMaxQty,
      });

      showNotification(`${product.name} added to cart.`);
    }

    setCartItems(currentItems);
    saveToStorage(currentItems);

    // Send to backend if user is authenticated
    const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
    if (isAuthenticated && product.id) {
      try {
        await cartAPI.addToCart({
          product_id: product.id,
          product_name: product.name || product.product_name || '',
          price: product.price || 0,
          quantity: quantity,
          image_url: product.image_url || '',
          description: product.description || ''
        });
        // Reload cart from backend to get updated cart_item_id
        // This ensures cart_item_id is available for future remove/update operations
        await loadCartFromBackend();
      } catch (error) {
        console.error('Error adding item to backend cart:', error);
        // Don't show error to user, local cart is already updated
      }
    }
  };

  const removeFromCart = async (productId) => {
    const itemToRemove = cartItems.find((item) => item.id === productId);

    // Update local state first
    setCartItems((prev) => prev.filter((item) => item.id !== productId));

    if (itemToRemove) {
      showNotification(`${itemToRemove.name} removed from cart.`);
    }

    // Sync with backend if user is authenticated and cart_item_id exists
    const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
    if (isAuthenticated && itemToRemove && itemToRemove.cart_item_id) {
      try {
        await cartAPI.removeFromCart(itemToRemove.cart_item_id);
      } catch (error) {
        console.error('Error removing item from backend cart:', error);
        // Reload cart from backend to sync state
        loadCartFromBackend();
      }
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cartItems.find((entry) => entry.id === productId);
    if (!item) {
      return;
    }

    const { maxQuantity } = item;
    if (maxQuantity !== null && maxQuantity !== undefined && newQuantity > maxQuantity) {
      showNotification(`Only ${maxQuantity} unit(s) of ${item.name} available.`);
      return;
    }

    if (item.quantity === newQuantity) {
      return;
    }

    // Update local state first
    setCartItems((prev) => 
      prev.map((entry) =>
        entry.id === productId ? { ...entry, quantity: newQuantity } : entry
      )
    );

    // Sync with backend if user is authenticated and cart_item_id exists
    const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
    if (isAuthenticated && item.cart_item_id) {
      try {
        await cartAPI.updateCartItem(item.cart_item_id, newQuantity);
      } catch (error) {
        console.error('Error updating item quantity in backend cart:', error);
        // Reload cart from backend to sync state
        loadCartFromBackend();
      }
    }
  };

  const clearCart = async () => {
    setCartItems([]);
    showNotification("Cart has been cleared.");

    // Sync with backend if user is authenticated
    const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
    if (isAuthenticated) {
      try {
        await cartAPI.clearCart();
      } catch (error) {
        console.error('Error clearing backend cart:', error);
        // Reload cart from backend to sync state
        loadCartFromBackend();
      }
    }
  };

  const clearNotification = () => setNotification("");

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      notification,
      clearNotification,
    }),
    [cartItems, notification],
  );


  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}