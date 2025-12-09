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

  const addToCart = (product) => {
    if (!product) return;

    // 1. ÖNEMLİ: React State'ine (prev) güvenmek yerine,
    // o an diskte (localStorage) ne kayıtlıysa onu çekiyoruz.
    // Bu sayede Sepet sayfasında sildiğiniz ürünler gerçekten silinmiş olarak gelir.
    let currentItems = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      currentItems = stored ? JSON.parse(stored) : [];
    } catch (e) {
      currentItems = [];
    }

    const maxQuantity = getMaxQuantity(product);
    
    // 2. Şimdi bu GÜNCEL liste üzerinde işlem yapıyoruz
    const existingIndex = currentItems.findIndex((item) => item.id === product.id);

    if (maxQuantity === 0) {
      showNotification(`${product.name} is out of stock.`);
      return;
    }

    if (existingIndex > -1) {
      // Ürün zaten varsa miktarını artır
      const existingItem = currentItems[existingIndex];
      const nextQuantity = (existingItem.quantity || 1) + 1;

      if (maxQuantity !== null && nextQuantity > maxQuantity) {
        showNotification(`Only ${maxQuantity} unit(s) of ${product.name} available.`);
        return;
      }

      // Dizideki o elemanı güncelle
      currentItems[existingIndex] = {
        ...existingItem,
        quantity: nextQuantity,
        maxQuantity: existingItem.maxQuantity ?? maxQuantity
      };
      
      showNotification(`${product.name} quantity updated.`);
    } else {
      // Ürün yoksa listeye yeni ekle
      currentItems.push({
        id: product.id ?? generateCartId(),
        name: product.name,
        price: product.price ?? 0,
        quantity: 1,
        image_url: product.image_url,
        description: product.description,
        maxQuantity,
      });
      
      showNotification(`${product.name} is added to your cart.`);
    }

    // 3. Son olarak hem State'i hem de LocalStorage'ı güncelliyoruz
    // (State güncellemesi UI'ın anlık değişmesini sağlar)
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

      showNotification("Cart quantity updated.");
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