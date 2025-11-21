import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../../api';
import './StockManagement.css';

function StockManagement() {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingStock, setEditingStock] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const response = await productManagerAPI.getStock();
      setStock(response.data.stock || []);
      setError('');
    } catch (err) {
      setError('Failed to load stock data');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingStock(item.product_id);
    setNewQuantity(item.quantity_in_stock);
  };

  const handleSave = async (productId) => {
    try {
      await productManagerAPI.updateStock(productId, parseInt(newQuantity));
      await fetchStock();
      setEditingStock(null);
      setNewQuantity('');
      setError('');
    } catch (err) {
      setError('Failed to update stock');
      console.error('Error:', err);
    }
  };

  const handleCancel = () => {
    setEditingStock(null);
    setNewQuantity('');
  };

  if (loading) {
    return <div className="sm-loading">Loading stock data...</div>;
  }

  return (
    <div className="stock-management-container">
      <h1>Stock Management</h1>

      {error && <div className="sm-error">{error}</div>}

      <div className="stock-table-container">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Product Name</th>
              <th>Current Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((item) => (
              <tr key={item.product_id} className={item.out_of_stock ? 'out-of-stock-row' : item.low_stock ? 'low-stock-row' : ''}>
                <td>{item.product_id}</td>
                <td>{item.product_name}</td>
                <td>
                  {editingStock === item.product_id ? (
                    <input
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      className="quantity-input"
                      min="0"
                    />
                  ) : (
                    <span className={item.out_of_stock ? 'stock-zero' : item.low_stock ? 'stock-low' : 'stock-normal'}>
                      {item.quantity_in_stock}
                    </span>
                  )}
                </td>
                <td>
                  {item.out_of_stock && <span className="status-badge out-of-stock">Out of Stock</span>}
                  {item.low_stock && !item.out_of_stock && <span className="status-badge low-stock">Low Stock</span>}
                  {!item.low_stock && !item.out_of_stock && <span className="status-badge in-stock">In Stock</span>}
                </td>
                <td>
                  {editingStock === item.product_id ? (
                    <div className="edit-actions">
                      <button className="btn-save" onClick={() => handleSave(item.product_id)}>
                        Save
                      </button>
                      <button className="btn-cancel" onClick={handleCancel}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className="btn-edit" onClick={() => handleEdit(item)}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StockManagement;


