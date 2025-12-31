import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from '../context/CartContext';
import "./PaymentMockFlow.css";
// generateInvoicePdf yanına getInvoiceBase64 eklendi
import { generateInvoicePdf, getInvoiceBase64 } from "./invoiceUtils";

export default function PaymentMockFlow({
  amount,
  currency = "TRY",
  cartItems = [],
  order = null,
  onSuccess,
  onCancel,
}) {
  const navigate = useNavigate();
  const { setNotification } = useCart();
  const [step, setStep] = useState("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [orderId, setOrderId] = useState(null);

  // Email gönderme fonksiyonunda PDF oluşturma mantığı eklendi
  // Not: Backend'e göndermek için 'fullOrderData' parametresini ekliyoruz
  async function sendOrderEmail(orderId, amount, fullOrderData) {
    try {
      let userEmail = localStorage.getItem('user_email') || 'almiraaygun@gmail.com';
      if (!userEmail.includes('@gmail.com') && !userEmail.includes('@sabanciuniv.edu')) {
        userEmail = 'almiraaygun@gmail.com';
      }
      const userName = localStorage.getItem('user_name') || 'Müşteri';

      // PDF Base64 verisini oluştur
      let pdfData = null;
      if (fullOrderData) {
        try {
          pdfData = getInvoiceBase64(fullOrderData);
        } catch (pdfErr) {
          console.error("PDF generation failed for email:", pdfErr);
        }
      }

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
          })),
          // Backend'e PDF verisini gönderiyoruz
          pdf_base64: pdfData
        })
      });

      if (response.ok) {
        if (setNotification) {
          setNotification('✅ Faturanız email adresinize gönderildi!');
        }
      } else {
        if (setNotification) {
          setNotification('⚠️ Sipariş alındı fakat email gönderilemedi.');
        }
      }
    } catch (error) {
      console.error('⚠️ Email hatası:', error);
      if (setNotification) {
        setNotification('⚠️ Email servisinde geçici bir sorun oluştu.');
      }
    }
  }

  function formatCardNumber(value) {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  }

  function formatExpiry(value) {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  }

  const maskedCard = cardNumber
    ? "**** **** **** " + (cardNumber.replace(/\s/g, "").slice(-4) || "0000")
    : "**** **** **** 0000";

  function handleCardNumberChange(e) {
    let val = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (val.length > 16) val = val.slice(0, 16); // Limit to 16 digits

    // Add spaces every 4 digits
    let formatted = "";
    for (let i = 0; i < val.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += " ";
      }
      formatted += val[i];
    }
    setCardNumber(formatted);
  }

  function handleExpiryChange(e) {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);

    if (val.length >= 2) {
      setExpiry(val.slice(0, 2) + "/" + val.slice(2));
    } else {
      setExpiry(val);
    }
  }

  function handleCvvChange(e) {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 3) val = val.slice(0, 3);
    setCvv(val);
  }

  function handleCardSubmit(e) {
    e.preventDefault();

    // Temel boş alan kontrolü
    if (!cardName || !cardNumber || !expiry || !cvv) {
      setError("Please fill in all fields.");
      return;
    }

    // Kart Numarası Kontrolü (Tam 16 hane olmalı)
    const rawCardNum = cardNumber.replace(/\s/g, "");
    if (rawCardNum.length !== 16) {
      setError("Card number must be 16 digits.");
      return;
    }

    // Son Kullanma Tarihi Kontrolü
    if (expiry.length !== 5 || !expiry.includes('/')) {
      setError("Expiry date must be in MM/YY format.");
      return;
    }

    const [expMonth, expYear] = expiry.split('/');
    const currentYear = new Date().getFullYear() % 100; // Son 2 hane
    const currentMonth = new Date().getMonth() + 1;

    const monthNum = parseInt(expMonth, 10);
    const yearNum = parseInt(expYear, 10);

    if (monthNum < 1 || monthNum > 12) {
      setError("Invalid month in expiry date.");
      return;
    }

    if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
      setError("Card has expired.");
      return;
    }

    // CVV Kontrolü
    if (cvv.length !== 3) {
      setError("CVV must be 3 digits.");
      return;
    }

    // İsim Kontrolü (Sadece harf ve boşluk)
    const nameRegex = /^[a-zA-Z\s]*$/;
    if (!nameRegex.test(cardName.trim())) {
      setError("Cardholder name must contain only letters.");
      return;
    }

    setError("");
    setStep("3ds");
  }

  async function handle3DSConfirm(e) {
    e.preventDefault();
    if (code !== "123456") {
      setError("Incorrect code.");
      return;
    }
    setError("");

    try {
      const userEmail = localStorage.getItem('user_email') || 'almiraaygun@gmail.com';
      const userName = localStorage.getItem('user_name') || 'Müşteri';
      const deliveryAddress = localStorage.getItem('user_address') || 'Sabancı University, Istanbul, Turkey';

      if (!cartItems || cartItems.length === 0) {
        setError("Cart is empty.");
        return;
      }

      const orderData = {
        customer_name: userName,
        customer_email: userEmail,
        total_price: amount,
        delivery_address: deliveryAddress,
        items: cartItems.map(item => ({
          product_id: item.id || item.product_id,
          product_name: item.name || item.product_name,
          quantity: item.quantity || 1,
          price: item.price || 0
        }))
      };

      const orderResponse = await fetch('http://localhost:8000/orders/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      let mainOrderId;
      if (orderResponse.ok) {
        const orderResult = await orderResponse.json();
        mainOrderId = orderResult.order?.delivery_id || orderResult.delivery_id;
      } else {
        console.error('Order creation failed');
        mainOrderId = `INV-${Math.floor(Math.random() * 900000 + 100000)}`;
      }

      setOrderId(mainOrderId);

      // Fatura için gerekli veri objesini hazırla
      // NOT: Gerçek projede vergi ve subtotal hesaplaması daha hassas yapılmalı.
      const subtotalVal = amount / 1.18;
      const taxVal = amount - subtotalVal;

      const fullOrderData = {
        id: mainOrderId,
        date: new Date().toLocaleDateString('tr-TR'),
        customerName: userName,
        paymentMethod: "Credit Card",
        address: {
          line1: deliveryAddress,
          city: "Istanbul",
          country: "Turkey"
        },
        items: cartItems.map(i => ({
          name: i.name || i.product_name,
          quantity: i.quantity || 1,
          price: i.price || 0
        })),
        subtotal: subtotalVal,
        tax: taxVal,
        total: amount
      };

      // Modal kapanmasın, başarı ekranına geçsin
      setStep("success");

      // Email işlemini (PDF ekleyerek) başlat
      // React state güncellemesi asenkron olduğu için 'order' prop'u yerine
      // burada oluşturduğumuz 'fullOrderData'yı kullanıyoruz.
      sendOrderEmail(mainOrderId, amount, fullOrderData);

    } catch (error) {
      console.error('Error creating order:', error);
      setError('An error occurred. Please try again.');
    }
  }

  function handleClose() {
    if (step === "success") {
      if (onSuccess) onSuccess(orderId);
      else if (onCancel) onCancel();
      return;
    }
    if (onCancel) onCancel();
  }

  function handleContinueToProfile() {
    if (onSuccess) onSuccess(orderId);
    navigate('/profile');
  }

  function handleDownloadInvoice() {
    // Eğer dışarıdan gelen order prop'u yoksa, son işlemdeki veriyi kullanmak gerekebilir
    // Ancak basitlik adına mevcut order prop'unu veya başarı ekranındaki veriyi kullanıyoruz.
    if (!order) return;
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
                onChange={handleCardNumberChange}
                placeholder="4242 4242 4242 4242"
                maxLength="19"
              />
            </label>

            <div className="pm-row">
              <label>
                Expiry (MM/YY)
                <input
                  type="text"
                  value={expiry}
                  onChange={handleExpiryChange}
                  placeholder="12/29"
                  maxLength="5"
                  autoComplete="cc-exp"
                />
              </label>
              <label>
                CVV
                <input
                  type="password"
                  value={cvv}
                  onChange={handleCvvChange}
                  placeholder="123"
                  maxLength="3"
                  autoComplete="off"
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
            {/* GÜNCELLEME: İstenilen yazı değişikliği */}
            <p>Your order details and invoice have been sent to your email address.</p>

            <p className="pm-success-order">
              Order number: <span>{orderId}</span>
            </p>
            <p className="pm-success-amount">
              Amount paid: <strong>{amount} {currency}</strong>
            </p>

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

            <button className="pm-primary" onClick={handleContinueToProfile}>
              Continue to Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}