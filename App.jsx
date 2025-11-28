import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import Menubar from './components/Menubar';
import Homepage from './components/Homepage';
import Products from './components/Products';
import Cart from './components/Cart';
import About from './components/About.jsx';
import Categories from './components/Categories.jsx';
import ForgotPassword from './components/ForgotPassword.jsx';
import Profile from './components/Profile.jsx';
import OrderHistory from './components/OrderHistory.jsx';
import CommentApproval from './components/ProductManager/CommentApproval.jsx';
import { CartProvider } from './context/CartContext';
import Notification from './components/Notification';
import './App.css';
import Checkout from "./components/src/Checkout";
import OrderConfirmation from "./OrderConfirmation";
import DeliveryDashboard from "./components/DeliveryDepartment/DeliveryDashboard";
import OrderManagement from "./components/ProductManager/OrderManagement.jsx";

function App() {
  return (
    <CartProvider>
      <Router>
        <div className="App">
          <Menubar />
          <Notification />
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/order-history" element={<OrderHistory />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/about" element={<About />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/order-history" element={<OrderHistory />} />
            <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
            <Route path="/delivery/orders" element={<OrderManagement />} />
            <Route path="/product-manager/comments" element={<CommentApproval />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
