// src/product_manager_api/index.js

const API_BASE_URL = "http://localhost:8000";



export const productsAPI = {
  async getProducts(params = {}) {
    try {
      // Construct URLSearchParams from params
      const queryParams = new URLSearchParams();
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
      if (params.sort) queryParams.append('sort', params.sort);

      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/products/${queryString ? `?${queryString}` : ''}`;

      // 1. Fetch live data from backend with params
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const result = await response.json();
      return { data: result.products || [] };

    } catch (error) {
      console.error("Failed to fetch products from API:", error);
      return { data: [] };
    }
  },
};

