import { useState } from "react";
import "./PaymentMockFlow.css";

export default function PaymentMockFlow({ amount, currency = "TRY", onSuccess, onCancel }) {
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
            <button className="pm-primary" onClick={handleClose}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
