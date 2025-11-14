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
import { CartProvider } from './context/CartContext';
import Notification from './components/Notification';
import './App.css';

function App() {
  return (
    <CartProvider>
      <Notification />
      <Router>
        <div className="App">
          <Menubar />
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
