import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../../api';
import './ProductManagement.css';

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    serial_number: '',
    description: '',
    quantity_in_stock: '',
    price: '',
    warranty_status: '',
    distributor: '',
    category: '',
    cost: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productManagerAPI.updateProduct(editingProduct.id, formData);
      } else {
        await productManagerAPI.createProduct(formData);
      }
      fetchProducts();
      resetForm();
      setError('');
    } catch (err) {
      setError('Failed to save product');
      console.error('Error:', err);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      model: product.model || '',
      serial_number: product.serial_number || '',
      description: product.description || '',
      quantity_in_stock: product.quantity_in_stock || '',
      price: product.price || '',
      warranty_status: product.warranty_status || '',
      distributor: product.distributor || '',
      category: product.category || '',
      cost: product.cost || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productManagerAPI.deleteProduct(productId);
        fetchProducts();
      } catch (err) {
        setError('Failed to delete product');
        console.error('Error:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      model: '',
      serial_number: '',
      description: '',
      quantity_in_stock: '',
      price: '',
      warranty_status: '',
      distributor: '',
      category: '',
      cost: ''
    });
    setEditingProduct(null);
    setShowAddForm(false);
  };

  if (loading) {
    return <div className="pm-loading">Loading products...</div>;
  }

  return (
    <div className="product-management-container">
      <div className="pm-header">
        <h1>Product Management</h1>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add New Product'}
        </button>
      </div>

      {error && <div className="pm-error">{error}</div>}

      {showAddForm && (
        <form className="product-form" onSubmit={handleSubmit}>
          <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Model *</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Serial Number *</label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price *</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Cost (for profit calculation)</label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Quantity in Stock *</label>
              <input
                type="number"
                value={formData.quantity_in_stock}
                onChange={(e) => setFormData({ ...formData, quantity_in_stock: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Warranty Status</label>
              <input
                type="text"
                value={formData.warranty_status}
                onChange={(e) => setFormData({ ...formData, warranty_status: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Distributor</label>
              <input
                type="text"
                value={formData.distributor}
                onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editingProduct ? 'Update Product' : 'Create Product'}
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Model</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.id}</td>
                <td>{product.name}</td>
                <td>{product.model}</td>
                <td>{product.category}</td>
                <td>${product.price}</td>
                <td className={product.quantity_in_stock === 0 ? 'out-of-stock' : product.quantity_in_stock < 20 ? 'low-stock' : ''}>
                  {product.quantity_in_stock}
                </td>
                <td>
                  <button className="btn-edit" onClick={() => handleEdit(product)}>
                    Edit
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(product.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductManagement;


