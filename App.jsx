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

// --- YENİ EKLENEN IMPORT ---
import ProductDetail from './components/ProductDetail';
import Dashboard from './components/ProductManager/Dashboard';
import ProductManagement from './components/ProductManager/ProductManagement';
import CategoryManagement from './components/ProductManager/CategoryManagement';
import StockManagement from './components/ProductManager/StockManagement';
import SupportChat from './components/SupportChat/SupportChat';
import SupportAgentDashboard from './components/SupportAgent/SupportAgentDashboard';
import Wishlist from './components/Wishlist';
import SalesDashboard from './components/SalesManager/SalesDashboard';
import DiscountManagement from './components/SalesManager/DiscountManagement';
import InvoiceManagement from './components/SalesManager/InvoiceManagement';
import RevenueAnalysis from './components/SalesManager/RevenueAnalysis';
import RefundManagement from './components/SalesManager/RefundManagement'; 

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
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/products" element={<Products />} />

            {/* --- YENİ EKLENEN ROUTE --- */}
            {/* :id kısmı, ürünün ID'sinin (örneğin 2) buraya geleceğini belirtir */}
            <Route path="/product/:id" element={<ProductDetail />} />

            <Route path="/categories" element={<Categories />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/about" element={<About />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
            <Route path="/delivery/orders" element={<OrderManagement />} />

            {/* Product Manager Routes */}
            <Route path="/product-manager" element={<Dashboard />} />
            <Route path="/product-manager/products" element={<ProductManagement />} />
            <Route path="/product-manager/stock" element={<StockManagement />} />
            <Route path="/product-manager/categories" element={<CategoryManagement />} />
            <Route path="/product-manager/orders" element={<OrderManagement />} />
            <Route path="/product-manager/comments" element={<CommentApproval />} />
            
            {/* Sales Manager Routes */}
            <Route path="/sales-manager" element={<SalesDashboard />} />
            <Route path="/sales-manager/discounts" element={<DiscountManagement />} />
            <Route path="/sales-manager/invoices" element={<InvoiceManagement />} />
            <Route path="/sales-manager/revenue" element={<RevenueAnalysis />} />
            <Route path="/sales-manager/refunds" element={<RefundManagement />} />
            
            <Route path="/support/dashboard" element={<SupportAgentDashboard />} />
          </Routes>
          {/* Support Chat Widget - Available on all pages */}
          <SupportChat />
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;