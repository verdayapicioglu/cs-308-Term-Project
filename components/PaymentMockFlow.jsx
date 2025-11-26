import { useState } from "react";
import "./PaymentMockFlow.css";

export default function PaymentMockFlow({ amount, currency = "TRY", cartItems = [], onSuccess, onCancel }) {
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

  // Email gönderme fonksiyonu
  async function sendOrderEmail(orderId, amount) {
    try {
      // Gerçek email adresi kontrolü - @gmail.com veya @sabanciuniv.edu olmalı
      let userEmail = localStorage.getItem('user_email') || 'almiraaygun@gmail.com';
      // Eğer test email'i ise (admin@petstore.com gibi), gerçek email kullan
      if (!userEmail.includes('@gmail.com') && !userEmail.includes('@sabanciuniv.edu')) {
        userEmail = 'almiraaygun@gmail.com';
      }
      const userName = localStorage.getItem('user_name') || 'Müşteri';
      
      const response = await fetch('http://localhost:8000/api/send-order-email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: userEmail,
          user_name: userName,
          order_id: orderId,
          amount: amount,
          currency: currency,
          items: cartItems.map(item => ({
            name: item.name || item.product_name,
            quantity: item.quantity || 1,
            price: item.price || 0
          }))
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Sipariş emaili gönderildi!', result);
        // Kullanıcıya görünür mesaj göster
        alert('✅ Sipariş emaili başarıyla gönderildi! Gmail\'ini kontrol et.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('⚠️ Email gönderilemedi:', errorData);
        alert('⚠️ Email gönderilemedi, ama sipariş tamamlandı. Hata: ' + (errorData.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('⚠️ Email hatası:', error);
      alert('⚠️ Email gönderilirken hata oluştu: ' + error.message);
    }
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
    
    // Email gönder
    sendOrderEmail(fakeOrderId, amount);
    
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
