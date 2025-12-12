from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from product_manager_api.models import Product, Review
from django.contrib.auth.models import User


class ShoppingCartStep3Tests(TestCase):
    """
    Step 3: Add items to the shopping cart
    The user is not logged in to the system.
    """
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create Product A - Out of stock (cannot be added to cart)
        self.product_a = Product.objects.create(
            name="Product A",
            model="MOD-A",
            serial_number="SN-A-001",
            description="This is Product A description",
            quantity_in_stock=0,  # Out of stock
            price=99.99,
            warranty_status="1 year warranty",
            distributor="Distributor A",
            category="Food",
            cost=50.00
        )
        
        # Create Product B - In stock (can be added but requires authentication)
        self.product_b = Product.objects.create(
            name="Product B",
            model="MOD-B",
            serial_number="SN-B-001",
            description="This is Product B description",
            quantity_in_stock=10,
            price=149.99,
            warranty_status="2 years warranty",
            distributor="Distributor B",
            category="Accessories",
            cost=75.00
        )
        
        # Create Product C - In stock (can be added but requires authentication)
        self.product_c = Product.objects.create(
            name="Product C",
            model="MOD-C",
            serial_number="SN-C-001",
            description="Special Product C with unique features",
            quantity_in_stock=5,
            price=79.99,
            warranty_status="6 months warranty",
            distributor="Distributor C",
            category="Toys",
            cost=40.00
        )
        
        # Create additional products for sorting tests
        self.product_cheap = Product.objects.create(
            name="Cheap Product",
            model="MOD-CHEAP",
            serial_number="SN-CHEAP-001",
            description="Cheap product description",
            quantity_in_stock=20,
            price=29.99,
            warranty_status="No warranty",
            distributor="Distributor Cheap",
            category="Food",
            cost=15.00
        )
        
        self.product_expensive = Product.objects.create(
            name="Expensive Product",
            model="MOD-EXP",
            serial_number="SN-EXP-001",
            description="Expensive product description",
            quantity_in_stock=15,
            price=299.99,
            warranty_status="3 years warranty",
            distributor="Distributor Expensive",
            category="Housing",
            cost=150.00
        )
        
        # Create reviews for popularity sorting
        # Product B gets high ratings
        Review.objects.create(
            product_id=self.product_b.id,
            product_name=self.product_b.name,
            user_id="user1",
            user_name="User One",
            user_email="user1@test.com",
            rating=5,
            comment="Great product!",
            status="approved"
        )
        Review.objects.create(
            product_id=self.product_b.id,
            product_name=self.product_b.name,
            user_id="user2",
            user_name="User Two",
            user_email="user2@test.com",
            rating=4,
            comment="Very good!",
            status="approved"
        )
        
        # Product C gets medium ratings
        Review.objects.create(
            product_id=self.product_c.id,
            product_name=self.product_c.name,
            user_id="user3",
            user_name="User Three",
            user_email="user3@test.com",
            rating=3,
            comment="Okay product",
            status="approved"
        )
        
        # Product A gets low ratings
        Review.objects.create(
            product_id=self.product_a.id,
            product_name=self.product_a.name,
            user_id="user4",
            user_name="User Four",
            user_email="user4@test.com",
            rating=2,
            comment="Not great",
            status="approved"
        )
    
    def test_1_sort_products_by_price(self):
        """
        Test Case 1: Sort products depending on their price.
        User is not logged in.
        """
        # Make request without authentication
        response = self.client.get('/products/', {'sort': 'price'})
        
        # Assert successful response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('products', response.data)
        self.assertIn('count', response.data)
        
        products = response.data['products']
        
        # Verify products are sorted by price (ascending)
        prices = [float(p['price']) for p in products]
        self.assertEqual(prices, sorted(prices), "Products should be sorted by price ascending")
        
        # Verify first product is the cheapest
        self.assertEqual(products[0]['name'], "Cheap Product")
        self.assertEqual(float(products[0]['price']), 29.99)
        
        # Verify last product is the most expensive
        self.assertEqual(products[-1]['name'], "Expensive Product")
        self.assertEqual(float(products[-1]['price']), 299.99)
    
    def test_2_sort_products_by_popularity(self):
        """
        Test Case 2: Sort products depending on their popularity.
        User is not logged in.
        Popularity is based on average rating.
        """
        # Make request without authentication
        response = self.client.get('/products/', {'sort': 'popularity'})
        
        # Assert successful response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('products', response.data)
        
        products = response.data['products']
        
        # Verify products are sorted by popularity (average_rating descending)
        ratings = [float(p.get('average_rating', 0) or 0) for p in products]
        self.assertEqual(ratings, sorted(ratings, reverse=True), 
                        "Products should be sorted by popularity (rating) descending")
        
        # Verify Product B (highest rating: 4.5) comes before Product C (rating: 3.0)
        product_names = [p['name'] for p in products]
        product_b_index = product_names.index("Product B")
        product_c_index = product_names.index("Product C")
        self.assertLess(product_b_index, product_c_index, 
                       "Product B should come before Product C in popularity sort")
    
    def test_3_search_product_a_by_name_cannot_add_to_cart(self):
        """
        Test Case 3: Search for Product A by name and show that it cannot be added 
        to the shopping cart.
        User is not logged in.
        Product A is out of stock (quantity_in_stock = 0).
        """
        # Search for Product A by name (filter products client-side since backend doesn't have search)
        response = self.client.get('/products/')
        
        # Assert successful response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('products', response.data)
        
        products = response.data['products']
        
        # Find Product A in the list
        product_a_data = next((p for p in products if p['name'] == "Product A"), None)
        self.assertIsNotNone(product_a_data, "Product A should be found")
        self.assertEqual(product_a_data['quantity_in_stock'], 0, 
                        "Product A should be out of stock")
        
        # Attempt to add Product A to cart (without authentication)
        # This should fail due to authentication requirement
        add_to_cart_response = self.client.post('/api/cart/add/', {
            'product_id': self.product_a.id,
            'product_name': self.product_a.name,
            'price': float(self.product_a.price),
            'quantity': 1
        })
        
        # Should fail with 403 Forbidden (authentication required in this setup)
        self.assertEqual(add_to_cart_response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_4_search_product_b_by_name_add_to_cart_fails_authentication(self):
        """
        Test Case 4: Search for Product B by name and add it to the shopping cart.
        User is not logged in, so adding should fail due to authentication requirement.
        """
        # Search for Product B by name
        response = self.client.get('/products/')
        
        # Assert successful response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('products', response.data)
        
        products = response.data['products']
        
        # Find Product B in the list
        product_b_data = next((p for p in products if p['name'] == "Product B"), None)
        self.assertIsNotNone(product_b_data, "Product B should be found")
        self.assertGreater(product_b_data['quantity_in_stock'], 0, 
                          "Product B should be in stock")
        
        # Attempt to add Product B to cart (without authentication)
        add_to_cart_response = self.client.post('/api/cart/add/', {
            'product_id': self.product_b.id,
            'product_name': self.product_b.name,
            'price': float(self.product_b.price),
            'quantity': 1,
            'description': self.product_b.description
        })
        
        # Should fail with 403 Forbidden (authentication required in this setup)
        self.assertEqual(add_to_cart_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', add_to_cart_response.data or {})
    
    def test_5_search_product_c_by_description_add_to_cart_fails_authentication(self):
        """
        Test Case 5: Search for Product C by description and add it to the shopping cart.
        User is not logged in, so adding should fail due to authentication requirement.
        """
        # Search for Product C by description (filter products client-side)
        response = self.client.get('/products/')
        
        # Assert successful response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('products', response.data)
        
        products = response.data['products']
        
        # Find Product C by searching in description
        # Product C has description "Special Product C with unique features"
        product_c_data = next((p for p in products 
                               if 'unique features' in p['description'].lower()), None)
        self.assertIsNotNone(product_c_data, "Product C should be found by description")
        self.assertEqual(product_c_data['name'], "Product C")
        self.assertGreater(product_c_data['quantity_in_stock'], 0, 
                          "Product C should be in stock")
        
        # Attempt to add Product C to cart (without authentication)
        add_to_cart_response = self.client.post('/api/cart/add/', {
            'product_id': self.product_c.id,
            'product_name': self.product_c.name,
            'price': float(self.product_c.price),
            'quantity': 1,
            'description': self.product_c.description
        })
        
        # Should fail with 403 Forbidden (authentication required in this setup)
        self.assertEqual(add_to_cart_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('detail', add_to_cart_response.data or {})
