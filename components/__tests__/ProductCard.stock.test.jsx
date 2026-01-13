import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../ProductCard';
import { CartProvider } from '../../context/CartContext';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <CartProvider>
        {component}
      </CartProvider>
    </BrowserRouter>
  );
};

describe('Step 2: Product Stock Status Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test Case 1: Product A - Out of Stock
   * Requirement: Product A: out of stock (add button should be disabled)
   */
  it('Test 1: Product A - Out of stock product should have disabled add button', () => {
    const productA = {
      id: 1,
      name: 'Product A',
      description: 'Test product A',
      price: 100,
      quantity_in_stock: 0,
      category: 'Test',
      image_url: '/test.jpg',
    };

    renderWithProviders(<ProductCard product={productA} />);

    // Verify "Out of Stock" badge is displayed
    const outOfStockBadge = screen.getByText('Out of Stock');
    expect(outOfStockBadge).toBeInTheDocument();

    // Verify stock information shows 0
    const stockInfo = screen.getByText(/In Stock: 0/i);
    expect(stockInfo).toBeInTheDocument();

    // Verify add button is disabled
    const addButton = screen.getByRole('button', { name: /out of stock/i });
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveTextContent('Out of Stock');
  });

  /**
   * Test Case 2: Product B - Low Stock (1 unit)
   * Requirement: Product B: only one product in stock (when a user selects Product B, 
   * the number of items in stock should be shown, e.g. last 3 units)
   */
  it('Test 2: Product B - Low stock product (1 unit) should display "Last 1 unit!" warning', () => {
    const productB = {
      id: 2,
      name: 'Product B',
      description: 'Test product B',
      price: 150,
      quantity_in_stock: 1,
      category: 'Test',
      image_url: '/test.jpg',
    };

    renderWithProviders(<ProductCard product={productB} />);

    // Verify stock information is displayed
    const stockInfo = screen.getByText(/In Stock: 1/i);
    expect(stockInfo).toBeInTheDocument();
    
    // Verify "Last 1 unit!" warning is shown
    const warning = screen.getByText(/Last 1 unit!/i);
    expect(warning).toBeInTheDocument();
    
    // Verify add button is enabled for low stock products
    const addButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addButton).not.toBeDisabled();
    expect(addButton).toHaveTextContent('Add to Cart');
  });

  /**
   * Test Case 3: Product B - Low Stock (3 units)
   * Requirement: Product B with 3 units should show "Last 3 units!" warning
   */
  it('Test 3: Product B - Low stock product (3 units) should display "Last 3 units!" warning', () => {
    const productB = {
      id: 2,
      name: 'Product B',
      description: 'Test product B',
      price: 150,
      quantity_in_stock: 3,
      category: 'Test',
      image_url: '/test.jpg',
    };

    renderWithProviders(<ProductCard product={productB} />);

    // Verify stock information is displayed
    const stockInfo = screen.getByText(/In Stock: 3/i);
    expect(stockInfo).toBeInTheDocument();
    
    // Verify "Last 3 units!" warning is shown
    const warning = screen.getByText(/Last 3 units!/i);
    expect(warning).toBeInTheDocument();
    
    // Verify add button is enabled
    const addButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addButton).not.toBeDisabled();
  });

  /**
   * Test Case 4: Product C - High Stock
   * Requirement: Product C: high number in stock
   */
  it('Test 4: Product C - High stock product should have enabled button and no warnings', () => {
    const productC = {
      id: 3,
      name: 'Product C',
      description: 'Test product C',
      price: 200,
      quantity_in_stock: 50,
      category: 'Test',
      image_url: '/test.jpg',
    };

    renderWithProviders(<ProductCard product={productC} />);

    // Verify stock is displayed
    const stockInfo = screen.getByText(/In Stock: 50/i);
    expect(stockInfo).toBeInTheDocument();

    // Verify add button is enabled
    const addButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addButton).not.toBeDisabled();
    expect(addButton).toHaveTextContent('Add to Cart');

    // Verify no "Out of Stock" badge is present
    expect(screen.queryByText('Out of Stock')).not.toBeInTheDocument();
    
    // Verify no "Last X units" warning is present for high stock
    expect(screen.queryByText(/Last \d+ units?!/i)).not.toBeInTheDocument();
  });

  /**
   * Test Case 5: Comprehensive Test - All Three Products
   * Requirement: Verify all three products (A, B, C) display correct stock status
   */
  it('Test 5: All three products should display correct stock status and button states', () => {
    const products = [
      { id: 1, name: 'Product A', price: 100, quantity_in_stock: 0, category: 'Test', image_url: '/test.jpg', description: 'Test A' },
      { id: 2, name: 'Product B', price: 150, quantity_in_stock: 1, category: 'Test', image_url: '/test.jpg', description: 'Test B' },
      { id: 3, name: 'Product C', price: 200, quantity_in_stock: 50, category: 'Test', image_url: '/test.jpg', description: 'Test C' },
    ];

    // Test Product A - Out of stock
    const { rerender } = renderWithProviders(<ProductCard product={products[0]} />);
    expect(screen.getByText(/In Stock: 0/i)).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByText(/Last \d+ units?!/i)).not.toBeInTheDocument();

    // Test Product B - Low stock (1 unit)
    rerender(
      <BrowserRouter>
        <CartProvider>
          <ProductCard product={products[1]} />
        </CartProvider>
      </BrowserRouter>
    );
    expect(screen.getByText(/In Stock: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Last 1 unit!/i)).toBeInTheDocument();
    const buttonB = screen.getByRole('button', { name: /add to cart/i });
    expect(buttonB).not.toBeDisabled();
    expect(screen.queryByText('Out of Stock')).not.toBeInTheDocument();

    // Test Product C - High stock (50 units)
    rerender(
      <BrowserRouter>
        <CartProvider>
          <ProductCard product={products[2]} />
        </CartProvider>
      </BrowserRouter>
    );
    expect(screen.getByText(/In Stock: 50/i)).toBeInTheDocument();
    expect(screen.queryByText(/Last \d+ units?!/i)).not.toBeInTheDocument();
    const buttonC = screen.getByRole('button', { name: /add to cart/i });
    expect(buttonC).not.toBeDisabled();
    expect(screen.queryByText('Out of Stock')).not.toBeInTheDocument();
  });
});
