import React, { useState, useEffect } from 'react';
import { productManagerAPI } from '../../api';
import './CategoryManagement.css';

function CategoryManagement() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await productManagerAPI.getCategories();
      setCategories(response.data.categories || []);
      setError('');
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    try {
      await productManagerAPI.createCategory(newCategory.trim());
      setNewCategory('');
      await fetchCategories();
      setError('');
    } catch (err) {
      setError('Failed to create category. It may already exist.');
      console.error('Error:', err);
    }
  };

  const handleDelete = async (categoryName) => {
    if (window.confirm(`Are you sure you want to delete category "${categoryName}"?`)) {
      try {
        await productManagerAPI.deleteCategory(categoryName);
        await fetchCategories();
        setError('');
      } catch (err) {
        setError('Failed to delete category');
        console.error('Error:', err);
      }
    }
  };

  if (loading) {
    return <div className="cm-loading">Loading categories...</div>;
  }

  return (
    <div className="category-management-container">
      <h1>Category Management</h1>

      {error && <div className="cm-error">{error}</div>}

      <form className="add-category-form" onSubmit={handleAdd}>
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Enter new category name"
          className="category-input"
        />
        <button type="submit" className="btn-add">
          + Add Category
        </button>
      </form>

      <div className="categories-grid">
        {categories.map((category) => (
          <div key={category} className="category-card">
            <div className="category-name">{category}</div>
            <button
              className="btn-delete"
              onClick={() => handleDelete(category)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="no-categories">No categories found.</div>
      )}
    </div>
  );
}

export default CategoryManagement;


