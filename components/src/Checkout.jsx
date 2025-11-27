import React from "react";
import { useCart } from "./context/CartContext";
import { useNavigate } from "react-router-dom";

export default function Checkout() {
  const { cart, total, clearCart } = useCart();
  const navigate = useNavigate();

  const placeOrder = async () => {
    const orderData = {
      customer_name: "Demo User",
      customer_email: "demo@example.com",
      delivery_address: "Test Address 123",
      total_price: total,
      orders: cart.map((item) => ({
        product_id: item.id,
        quantity: item.qty,
      })),
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/orders/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (response.ok) {
        const orderId =
          data.order?.delivery_id || data.order_id || "N/A";

        clearCart();

        navigate("/order-confirmation", { state: { orderId } });
      } else {
        console.error("Order error:", data);
        alert("Sipariş oluşturulamadı.");
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Sunucuya bağlanırken bir hata oluştu.");
    }
  };

  return (
    <div>
      <h1>Checkout</h1>

      <h2>Products in Cart</h2>
      {cart.length === 0 && <p>Your cart is empty.</p>}

      <ul>
        {cart.map((item) => (
          <li key={item.id}>
            {item.name} x {item.qty} → {item.price * item.qty} TL
          </li>
        ))}
      </ul>

      <h3>Total: {total} TL</h3>

      {/* ⭐⭐ İŞTE ARADIĞIN BUTON BURADA ⭐⭐ */}
      <button onClick={placeOrder}>Place Order</button>
    </div>
  );
}