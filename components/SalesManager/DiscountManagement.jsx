import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../api';
import './DiscountManagement.css';

function DiscountManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [discountData, setDiscountData] = useState({
    discount_rate: '',
    discount_start_date: '',
    discount_end_date: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productManagerAPI.getManagerProducts();
      setProducts(response.data.products || []);
      setError('');
    } catch (err) {
      setError('Failed to load products');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedProducts.length === 0) {
      setError('Please select at least one product');
      return;
    }

    if (!discountData.discount_rate || !discountData.discount_start_date || !discountData.discount_end_date) {
      setError('Please fill in all discount fields');
      return;
    }

    const discountRate = parseFloat(discountData.discount_rate);
    if (isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
      setError('Discount rate must be between 0 and 100');
      return;
    }

    try {
      const response = await productManagerAPI.setProductDiscount({
        product_ids: selectedProducts,
        discount_rate: discountRate,
        discount_start_date: discountData.discount_start_date,
        discount_end_date: discountData.discount_end_date
      });

      setSuccess(`Discount applied successfully! ${response.data.notified_users_count} users notified.`);
      setSelectedProducts([]);
      setDiscountData({
        discount_rate: '',
        discount_start_date: '',
        discount_end_date: ''
      });
      fetchProducts(); // Refresh products to show updated prices
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to apply discount';
      setError(errorMessage);
      console.error('Error applying discount:', err);
      if (err.response?.data?.trace) {
        console.error('Trace:', err.response.data.trace);
      }
    }
  };

  if (loading) {
    return <div className="discount-loading">Loading products...</div>;
  }

  return (
    <div className="discount-management-container">
      <h1 className="discount-title">Discount Management</h1>

      {error && <div className="discount-error">{error}</div>}
      {success && <div className="discount-success">{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Products ({products.length})</h2>
        <button 
          type="button" 
          onClick={fetchProducts}
          className="discount-refresh-btn"
          title="Refresh products list"
        >
          🔄 Refresh
        </button>
      </div>

      <form onSubmit={handleSubmit} className="discount-form">
        <div className="discount-form-group">
          <label>Discount Rate (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={discountData.discount_rate}
            onChange={(e) => setDiscountData({ ...discountData, discount_rate: e.target.value })}
            placeholder="e.g., 20"
            required
          />
        </div>

        <div className="discount-form-group">
          <label>Start Date</label>
          <input
            type="date"
            value={discountData.discount_start_date}
            onChange={(e) => setDiscountData({ ...discountData, discount_start_date: e.target.value })}
            required
          />
        </div>

        <div className="discount-form-group">
          <label>End Date</label>
          <input
            type="date"
            value={discountData.discount_end_date}
            onChange={(e) => setDiscountData({ ...discountData, discount_end_date: e.target.value })}
            required
          />
        </div>

        <div className="discount-products-section">
          <h3>Select Products ({selectedProducts.length} selected)</h3>
          <div className="discount-products-grid">
            {products.map(product => {
              const isSelected = selectedProducts.includes(product.id);
              const isOnDiscount = product.is_on_discount || 
                (product.discount_rate && product.discount_rate > 0 &&
                 product.discount_start_date && product.discount_end_date);
              
              return (
                <div
                  key={product.id}
                  className={`discount-product-card ${isSelected ? 'selected' : ''} ${isOnDiscount ? 'on-discount' : ''}`}
                  onClick={() => handleProductSelect(product.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleProductSelect(product.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="discount-product-info">
                    <h4>{product.name}</h4>
                    <p className="discount-product-price">
                      {product.original_price ? (
                        <>
                          <span className="original-price">{product.original_price} TL</span>
                          <span className="current-price">{product.price} TL</span>
                        </>
                      ) : (
                        <span>{product.price} TL</span>
                      )}
                    </p>
                    {isOnDiscount && (
                      <span className="discount-badge">
                        {product.discount_rate}% OFF
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" className="discount-submit-btn">
          Apply Discount
        </button>
      </form>
    </div>
  );
}

export default DiscountManagement;

