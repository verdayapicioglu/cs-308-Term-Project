import { createContext, useContext, useEffect, useMemo, useState } from "react";

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

  const [notification, setNotification] = useState("");
  const [notificationTimer, setNotificationTimer] = useState(null);

  useEffect(() => {
    saveToStorage(cartItems);
  }, [cartItems]);

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

  const addToCart = (product, quantity = 1) => {
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
  };

  const removeFromCart = (productId) => {
    const itemToRemove = cartItems.find((item) => item.id === productId);

    setCartItems((prev) => prev.filter((item) => item.id !== productId));

    if (itemToRemove) {
      showNotification(`${itemToRemove.name} removed from cart.`);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prev) => {
      const item = prev.find((entry) => entry.id === productId);
      if (!item) {
        return prev;
      }

      const { maxQuantity } = item;
      if (maxQuantity !== null && maxQuantity !== undefined && newQuantity > maxQuantity) {
        showNotification(`Only ${maxQuantity} unit(s) of ${item.name} available.`);
        return prev;
      }

      if (item.quantity === newQuantity) {
        return prev;
      }

      // showNotification("Cart quantity updated."); 
      // Update: Don't show notification for every increment/decrement to avoid spam
      return prev.map((entry) =>
        entry.id === productId ? { ...entry, quantity: newQuantity } : entry
      );
    });
  };

  const clearCart = () => {
    setCartItems([]);
    showNotification("Cart has been cleared.");
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