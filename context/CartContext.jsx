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

  useEffect(() => {
    saveToStorage(cartItems);
  }, [cartItems]);

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
  };

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => setCartItems([]);

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
    }),
    [cartItems],
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
