import { useState } from "react";
import "./PaymentMockFlow.css";
// 🔹 EKLEME: Invoice PDF için util
import { generateInvoicePdf } from "./invoiceUtils";

export default function PaymentMockFlow({
  amount,
  currency = "TRY",
  onSuccess,
  onCancel,
  // 🔹 EKLEME: Cart.jsx'ten gelecek sipariş objesi
  order,
}) {
  const [step, setStep] = useState("card"); // "card" | "3ds" | "success"
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [orderId, setOrderId] = useState(null);

  const maskedCard = cardNumber
    ? "**** **** **** " + (cardNumber.slice(-4) || "0000")
    : "**** **** **** 0000";

  function handleCardSubmit(e) {
    e.preventDefault();
    // basic fake validation
    if (!cardName || !cardNumber || !expiry || !cvv) {
      setError("Please fill in all fields.");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 12) {
      setError("Card number looks too short.");
      return;
    }
    if (cvv.length < 3) {
      setError("CVV must be at least 3 digits.");
      return;
    }
    setError("");
    setStep("3ds");
  }

  function handle3DSConfirm(e) {
    e.preventDefault();
    // Fake rule: accept code "123456"
    if (code !== "123456") {
      setError("Incorrect code.");
      return;
    }
    setError("");
    const fakeOrderId = "INV-" + Math.floor(Math.random() * 900000 + 100000);
    setOrderId(fakeOrderId);
    setStep("success");
    if (onSuccess) {
      onSuccess(fakeOrderId);
    }
  }

  function handleClose() {
    if (onCancel) onCancel();
  }

  // 🔹 EKLEME: PDF indirme handler'ı
  function handleDownloadInvoice() {
    if (!order) {
      console.warn("No order data provided for invoice.");
      return;
    }
    try {
      generateInvoicePdf(order);
    } catch (err) {
      console.error("Failed to generate invoice PDF", err);
    }
  }

  return (
    <div className="pm-overlay">
      <div className="pm-modal">
        <div className="pm-header">
          <h2>Payment Gateway</h2>
          <button className="pm-close" onClick={handleClose}>×</button>
        </div>

        <div className="pm-amount">
          <span>Amount:</span>
          <strong>
            {amount?.toFixed ? amount.toFixed(2) : amount} {currency}
          </strong>
        </div>

        {step === "card" && (
          <form className="pm-form" onSubmit={handleCardSubmit}>
            <h3>Enter Card Details</h3>
            <label>
              Cardholder Name
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Merve Gün"
              />
            </label>

            <label>
              Card Number
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 4242 4242 4242"
              />
            </label>

            <div className="pm-row">
              <label>
                Expiry (MM/YY)
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="12/29"
                />
              </label>
              <label>
                CVV
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                />
              </label>
            </div>

            {error && <div className="pm-error">{error}</div>}

            <button type="submit" className="pm-primary">
              Continue to 3D Secure
            </button>
          </form>
        )}

        {step === "3ds" && (
          <form className="pm-form" onSubmit={handle3DSConfirm}>
            <h3>3D Secure Verification</h3>
            <p className="pm-bank-title">Mock Bank • 3D Secure</p>
            <div className="pm-3ds-box">
              <p>We sent a one-time password (OTP) to your phone.</p>
              <p>
                <strong>Card:</strong> {maskedCard}
              </p>
              <p>
                <strong>Amount:</strong> {amount} {currency}
              </p>
            </div>

            <label>
              Enter 6-digit code:
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="••••••"
              />
            </label>

            {error && <div className="pm-error">{error}</div>}

            <button type="submit" className="pm-primary">
              Confirm Payment
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="pm-success">
            <div className="pm-success-icon">✔</div>
            <h3>Payment successful</h3>
            <p>Your payment has been processed.</p>
            <p className="pm-success-order">
              Order number: <span>{orderId}</span>
            </p>
            <p className="pm-success-amount">
              Amount paid: <strong>{amount} {currency}</strong>
            </p>

            {/* 🔹 EKLEME: Invoice önce ekranda görünsün */}
            {order && (
              <div className="pm-invoice-preview">
                <h4>Invoice Summary</h4>
                <p>
                  <strong>Customer:</strong> {order.customerName || "-"}
                </p>
                <p>
                  <strong>Date:</strong> {order.date || "-"}
                </p>
                <p>
                  <strong>Payment method:</strong> {order.paymentMethod || "-"}
                </p>

                <div className="pm-invoice-items">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="pm-invoice-item">
                      <span>{item.name}</span>
                      <span>x{item.quantity ?? 1}</span>
                      <span>
                        {(item.price ?? 0).toFixed(2)} TRY
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pm-invoice-totals">
                  <div>
                    Subtotal:{" "}
                    <strong>
                      {(order.subtotal ?? 0).toFixed(2)} TRY
                    </strong>
                  </div>
                  <div>
                    Tax:{" "}
                    <strong>
                      {(order.tax ?? 0).toFixed(2)} TRY
                    </strong>
                  </div>
                  <div>
                    Total:{" "}
                    <strong>
                      {(order.total ?? 0).toFixed(2)} TRY
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="pm-primary pm-invoice-download"
                  onClick={handleDownloadInvoice}
                >
                  Download Invoice (PDF)
                </button>
              </div>
            )}

            <button className="pm-primary" onClick={handleClose}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
