import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "cart_items";

const saveToStorage = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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


  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: product.id ?? generateCartId(),
          name: product.name,
          price: product.price ?? 0,
          quantity: 1,
          image_url: product.image_url,
          description: product.description,
        },
      ];
    });
    showNotification(`${product.name} is added to your cart.`);
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
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );

      showNotification("Cart quantity updated.");
    }
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