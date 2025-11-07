import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import Menubar from './components/Menubar';
import Homepage from './components/Homepage';
import Products from './components/Products';
import Cart from './components/Cart';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Menubar />
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          {/* Diğer route'lar buraya eklenecek */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
