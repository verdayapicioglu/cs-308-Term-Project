// src/product_manager_api/index.js

const API_BASE_URL = "http://localhost:8000";

// Local image mapping to restore visual elements since backend doesn't store images yet
const LOCAL_IMAGES = {
  1: "/images/cat-adult-salmon.jpeg",
  2: "/images/kitten-chicken.jpeg",
  3: "/images/dog-adult-lamb.jpeg",
  4: "/images/puppy-chicken.jpeg",
  5: "/images/cat-adult-salmon.jpeg",
  6: "/images/kitten-chicken.jpeg",
  7: "/images/dog-adult-lamb.jpeg",
  8: "/images/puppy-chicken.jpeg",
  9: "/images/cat-adult-salmon.jpeg",
  10: "/images/kitten-chicken.jpeg",
  11: "/images/dog-adult-lamb.jpeg",
  12: "/images/puppy-chicken.jpeg",
  13: "/images/cat-adult-salmon.jpeg",
  14: "/images/kitten-chicken.jpeg",
  15: "/images/dog-adult-lamb.jpeg",
  16: "/images/puppy-chicken.jpeg",
  17: "/images/cat-adult-salmon.jpeg",
  18: "/images/kitten-chicken.jpeg",
  19: "/images/dog-adult-lamb.jpeg",
  20: "/images/puppy-chicken.jpeg",
  21: "/images/cat-adult-salmon.jpeg",
  22: "/images/kitten-chicken.jpeg",
  23: "/images/dog-adult-lamb.jpeg",
  24: "/images/puppy-chicken.jpeg"
};

// Fallback images based on category if specific ID mapping is missing
const CATEGORY_IMAGES = {
  "Food": "/images/cat-adult-salmon.jpeg",
  "Collars & Leashes": "/images/cat-adult-salmon.jpeg",
  "Food & Water Bowls": "/images/cat-adult-salmon.jpeg",
  "Toys": "/images/cat-adult-salmon.jpeg",
  "Grooming & Hygiene": "/images/cat-adult-salmon.jpeg",
  "Treats & Snacks": "/images/cat-adult-salmon.jpeg"
};

export const productsAPI = {
  async getProducts(params = {}) {
    try {
      // 1. Fetch live data from backend
      const response = await fetch(`${API_BASE_URL}/products/`);

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const result = await response.json();
      let liveProducts = result.products || [];

      // 2. Augment with local images
      liveProducts = liveProducts.map(p => ({
        ...p,
        image_url: LOCAL_IMAGES[p.id] || CATEGORY_IMAGES[p.category] || "https://via.placeholder.com/300x300?text=Product"
      }));

      // 3. Apply Filtering Locally (matching previous behavior)
      let filteredProducts = [...liveProducts];

      // Category filter
      if (params.category) {
        filteredProducts = filteredProducts.filter(
          (p) => p.category === params.category
        );
      }

      // Search filter
      if (params.search) {
        const searchTerm = params.search.toLowerCase();
        filteredProducts = filteredProducts.filter(
          (p) =>
            (p.name || "").toLowerCase().includes(searchTerm) ||
            (p.description || "").toLowerCase().includes(searchTerm)
        );
      }

      // Sort filter
      if (params.sort === "price") {
        filteredProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      } else if (params.sort === "popularity") {
        // Sort by stock quantity (higher stock = more popular)
        filteredProducts.sort((a, b) => (b.quantity_in_stock || 0) - (a.quantity_in_stock || 0));
      }

      return { data: filteredProducts };

    } catch (error) {
      console.error("Failed to fetch products from API, falling back to empty list:", error);
      return { data: [] };
    }
  },
};
