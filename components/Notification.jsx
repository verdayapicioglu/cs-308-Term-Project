import React from 'react';
import { useCart } from '../context/CartContext'; 
import './Notification.css';

function Notification() {
  const { notification, clearNotification } = useCart();

  if (!notification) {
    return null;
  }

  return (
    <div className="notification-container active">
      <div className="notification-message">
        {notification}
      </div>
      <button onClick={clearNotification} className="notification-close-btn">
        &times;
      </button>
    </div>
  );
}

export default Notification;