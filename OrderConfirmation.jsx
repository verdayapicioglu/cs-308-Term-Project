import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function OrderConfirmation() {
  const location = useLocation();
  const orderId = location.state?.orderId; // Şimdilik opsiyonel, yoksa undefined olur

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>Order Confirmed 🎉</h1>
      <p>Your order has been successfully placed.</p>

      {orderId && (
        <p>
          <strong>Order ID:</strong> {orderId}
        </p>
      )}

      <p>An invoice has been generated for your order.</p>

      <div style={{ marginTop: "20px" }}>
        <Link to="/products">
          <button>Back to Products</button>
        </Link>
      </div>
    </div>
  );
}