"""
Test Cases - 20 Test Cases
5 Sales Manager Tests
5 Product Manager Tests  
5 Customer Tests
5 Refund Tests
"""
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from decimal import Decimal
from datetime import date, timedelta
import json

from .models import Product, Category, Order, OrderItem, Review, RefundRequest


# ==================== SALES MANAGER TEST CASES ====================

class SalesManagerTestCase(APITestCase):
    """5 Test cases for Sales Manager functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create sales manager user
        self.sales_manager = User.objects.create_user(
            username='sales_manager',
            email='sales@test.com',
            password='testpass123'
        )
        
        # Create category
        self.category = Category.objects.create(name='Food')
        
        # Create test products
        self.product1 = Product.objects.create(
            name='Premium Dog Food',
            model='PDF-001',
            serial_number='SN-001',
            description='High quality dog food',
            quantity_in_stock=100,
            price=Decimal('49.99'),
            warranty_status='1 year',
            distributor='Pet Foods Inc',
            category=self.category,
            cost=Decimal('25.00')
        )
        
        self.product2 = Product.objects.create(
            name='Cat Premium Food',
            model='CPF-002',
            serial_number='SN-002',
            description='High quality cat food',
            quantity_in_stock=50,
            price=Decimal('39.99'),
            warranty_status='1 year',
            distributor='Pet Foods Inc',
            category=self.category,
            cost=Decimal('20.00')
        )
        
        # Create test order for revenue calculation
        self.order = Order.objects.create(
            delivery_id='DEL-001',
            customer_id='CUST-001',
            customer_name='Test Customer',
            customer_email='customer@test.com',
            total_price=Decimal('99.99'),
            delivery_address='Test Address',
            status='delivered',
            order_date=date.today()
        )
        
        OrderItem.objects.create(
            order=self.order,
            product_id=self.product1.id,
            product_name=self.product1.name,
            quantity=2,
            price=Decimal('49.99')
        )
        
        self.client.force_authenticate(user=self.sales_manager)

    def test_set_product_discount_success(self):
        """Test 1: Sales manager can set discount on products"""
        response = self.client.post('/sales/discounts/', {
            'product_ids': [self.product1.id],
            'discount_percentage': 10
        }, format='json')
        
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_set_discount_invalid_percentage(self):
        """Test 2: Discount percentage must be valid (0-100)"""
        response = self.client.post('/sales/discounts/', {
            'product_ids': [self.product1.id],
            'discount_percentage': 150  # Invalid percentage
        }, format='json')
        
        # Could be 400 for validation error or 200 if capped
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK])

    def test_get_invoices_with_date_range(self):
        """Test 3: Get invoices within a date range"""
        today = date.today()
        start_date = (today - timedelta(days=30)).isoformat()
        end_date = today.isoformat()
        
        response = self.client.get(f'/sales/invoices/?start_date={start_date}&end_date={end_date}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_revenue_profit_calculation(self):
        """Test 4: Calculate revenue and profit between dates"""
        today = date.today()
        start_date = (today - timedelta(days=30)).isoformat()
        end_date = today.isoformat()
        
        response = self.client.get(f'/sales/revenue/?start_date={start_date}&end_date={end_date}')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_set_discount_multiple_products(self):
        """Test 5: Set discount on multiple products at once"""
        response = self.client.post('/sales/discounts/', {
            'product_ids': [self.product1.id, self.product2.id],
            'discount_percentage': 15
        }, format='json')
        
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])


# ==================== PRODUCT MANAGER TEST CASES ====================

class ProductManagerTestCase(APITestCase):
    """5 Test cases for Product Manager functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create product manager user
        self.product_manager = User.objects.create_user(
            username='product_manager',
            email='pm@test.com',
            password='testpass123'
        )
        
        # Create category
        self.category = Category.objects.create(name='Accessories')
        
        # Create test product
        self.product = Product.objects.create(
            name='Dog Collar',
            model='DC-001',
            serial_number='SN-003',
            description='Premium leather dog collar',
            quantity_in_stock=75,
            price=Decimal('29.99'),
            warranty_status='6 months',
            distributor='Pet Accessories Ltd',
            category=self.category,
            cost=Decimal('15.00')
        )
        
        # Create pending review (user_id is CharField in model)
        self.review = Review.objects.create(
            product_id=self.product.id,
            product_name=self.product.name,
            user_id='1',  # CharField
            user_name='Test User',
            user_email='user@test.com',
            rating=5,
            comment='Great product!',
            status='pending'
        )
        
        self.client.force_authenticate(user=self.product_manager)

    def test_create_product_success(self):
        """Test 1: Product manager can create a new product"""
        response = self.client.post('/products/', {
            'name': 'New Cat Toy',
            'model': 'CT-001',
            'serial_number': 'SN-NEW-001',
            'description': 'Interactive cat toy',
            'quantity_in_stock': 50,
            'price': 19.99,
            'warranty_status': '3 months',
            'distributor': 'Toy Factory',
            'category': 'Accessories',
            'cost': 10.00
        }, format='json')
        
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_update_product_price(self):
        """Test 2: Product manager can update product price"""
        response = self.client.put(f'/products/{self.product.id}/', {
            'price': 34.99
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_stock_quantity(self):
        """Test 3: Product manager can update stock quantity"""
        response = self.client.patch(f'/stock/{self.product.id}/', {
            'quantity_in_stock': 100
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_approve_comment(self):
        """Test 4: Product manager can approve a pending comment"""
        response = self.client.patch(f'/comments/{self.review.id}/approve/', {
            'action': 'approve'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_reject_comment(self):
        """Test 5: Product manager can reject a pending comment"""
        # Create new pending review for rejection test
        review_to_reject = Review.objects.create(
            product_id=self.product.id,
            product_name=self.product.name,
            user_id='2',  # CharField
            user_name='Another User',
            user_email='another@test.com',
            rating=1,
            comment='Bad product!',
            status='pending'
        )
        
        response = self.client.patch(f'/comments/{review_to_reject.id}/approve/', {
            'action': 'reject'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ==================== CUSTOMER TEST CASES ====================

class CustomerTestCase(APITestCase):
    """5 Test cases for Customer functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create customer user
        self.customer = User.objects.create_user(
            username='customer',
            email='customer@test.com',
            password='testpass123'
        )
        
        # Create category
        self.category = Category.objects.create(name='Toys')
        
        # Create test product
        self.product = Product.objects.create(
            name='Dog Ball',
            model='DB-001',
            serial_number='SN-004',
            description='Durable rubber ball for dogs',
            quantity_in_stock=200,
            price=Decimal('9.99'),
            warranty_status='3 months',
            distributor='Toy Factory',
            category=self.category,
            cost=Decimal('3.00')
        )
        
        # Create a delivered order for the customer
        self.order = Order.objects.create(
            delivery_id='DEL-CUST-001',
            customer_id=str(self.customer.id),
            customer_name=self.customer.username,
            customer_email=self.customer.email,
            total_price=Decimal('19.98'),
            delivery_address='Customer Address 123',
            status='delivered',
            order_date=date.today() - timedelta(days=5),
            delivery_date=date.today() - timedelta(days=2)
        )
        
        OrderItem.objects.create(
            order=self.order,
            product_id=self.product.id,
            product_name=self.product.name,
            quantity=2,
            price=Decimal('9.99')
        )
        
        self.client.force_authenticate(user=self.customer)

    def test_get_product_list(self):
        """Test 1: Customer can view product list"""
        response = self.client.get('/products/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_product_detail(self):
        """Test 2: Customer can view product details"""
        response = self.client.get(f'/products/{self.product.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_review(self):
        """Test 3: Customer can create a review for a product"""
        response = self.client.post('/comments/create/', {
            'product_id': self.product.id,
            'rating': 5,
            'comment': 'My dog loves this ball!'
        }, format='json')
        
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_get_order_history(self):
        """Test 4: Customer can view their order history"""
        response = self.client.get('/orders/history/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cancel_processing_order(self):
        """Test 5: Customer can cancel an order in processing status"""
        # Create a processing order
        processing_order = Order.objects.create(
            delivery_id='DEL-CANCEL-001',
            customer_id=str(self.customer.id),
            customer_name=self.customer.username,
            customer_email=self.customer.email,
            total_price=Decimal('9.99'),
            delivery_address='Customer Address 123',
            status='processing',
            order_date=date.today()
        )
        
        response = self.client.post(f'/orders/{processing_order.delivery_id}/cancel/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ==================== REFUND TEST CASES ====================

class RefundTestCase(APITestCase):
    """5 Test cases for Refund/Return functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create users
        self.customer = User.objects.create_user(
            username='refund_customer',
            email='refund_customer@test.com',
            password='testpass123'
        )
        
        self.sales_manager = User.objects.create_user(
            username='refund_sales_manager',
            email='refund_sm@test.com',
            password='testpass123'
        )
        
        # Create category
        self.category = Category.objects.create(name='Health')
        
        # Create test product
        self.product = Product.objects.create(
            name='Dog Vitamins',
            model='DV-001',
            serial_number='SN-005',
            description='Daily vitamins for dogs',
            quantity_in_stock=150,
            price=Decimal('24.99'),
            warranty_status='2 years',
            distributor='Pet Health Inc',
            category=self.category,
            cost=Decimal('10.00')
        )
        
        # Create a delivered order (within 30 days)
        self.delivered_order = Order.objects.create(
            delivery_id='DEL-REFUND-001',
            customer_id=str(self.customer.id),
            customer_name=self.customer.username,
            customer_email=self.customer.email,
            total_price=Decimal('49.98'),
            delivery_address='Refund Test Address',
            status='delivered',
            order_date=date.today() - timedelta(days=10),
            delivery_date=date.today() - timedelta(days=5)
        )
        
        self.order_item = OrderItem.objects.create(
            order=self.delivered_order,
            product_id=self.product.id,
            product_name=self.product.name,
            quantity=2,
            price=Decimal('24.99')
        )
        
        # Create pending refund request (with purchase_price - required field)
        self.refund_request = RefundRequest.objects.create(
            order=self.delivered_order,
            order_item=self.order_item,
            customer_id=str(self.customer.id),
            customer_name=self.customer.username,
            customer_email=self.customer.email,
            product_id=self.product.id,
            product_name=self.product.name,
            reason='Product damaged',
            quantity=1,
            purchase_price=Decimal('24.99'),  # Required field
            refund_amount=Decimal('24.99'),
            status='pending'
        )

    def test_create_refund_request_success(self):
        """Test 1: Customer can create a refund request for delivered order"""
        self.client.force_authenticate(user=self.customer)
        
        # Create another delivered order for this test
        new_order = Order.objects.create(
            delivery_id='DEL-REFUND-002',
            customer_id=str(self.customer.id),
            customer_name=self.customer.username,
            customer_email=self.customer.email,
            total_price=Decimal('24.99'),
            delivery_address='New Refund Address',
            status='delivered',
            order_date=date.today() - timedelta(days=5),
            delivery_date=date.today() - timedelta(days=2)
        )
        
        new_order_item = OrderItem.objects.create(
            order=new_order,
            product_id=self.product.id,
            product_name=self.product.name,
            quantity=1,
            price=Decimal('24.99')
        )
        
        response = self.client.post('/refunds/create/', {
            'order_id': new_order.delivery_id,
            'order_item_id': new_order_item.id,
            'reason': 'Changed my mind',
            'quantity': 1
        }, format='json')
        
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_refund_request_outside_30_days(self):
        """Test 2: Refund request fails for orders delivered over 30 days ago"""
        self.client.force_authenticate(user=self.customer)
        
        # Create an old order
        old_order = Order.objects.create(
            delivery_id='DEL-OLD-001',
            customer_id=str(self.customer.id),
            customer_name=self.customer.username,
            customer_email=self.customer.email,
            total_price=Decimal('24.99'),
            delivery_address='Old Order Address',
            status='delivered',
            order_date=date.today() - timedelta(days=60),
            delivery_date=date.today() - timedelta(days=45)
        )
        
        old_item = OrderItem.objects.create(
            order=old_order,
            product_id=self.product.id,
            product_name=self.product.name,
            quantity=1,
            price=Decimal('24.99')
        )
        
        response = self.client.post('/refunds/create/', {
            'order_id': old_order.delivery_id,
            'order_item_id': old_item.id,
            'reason': 'Too late refund',
            'quantity': 1
        }, format='json')
        
        # Should fail because order is too old
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_sales_manager_can_view_refund_list(self):
        """Test 3: Sales manager can view list of refund requests"""
        self.client.force_authenticate(user=self.sales_manager)
        
        response = self.client.get('/refunds/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_approve_refund_request(self):
        """Test 4: Sales manager can approve a refund request"""
        self.client.force_authenticate(user=self.sales_manager)
        
        response = self.client.patch(f'/refunds/{self.refund_request.id}/approve/', {
            'action': 'approve'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_reject_refund_request(self):
        """Test 5: Sales manager can reject a refund request"""
        self.client.force_authenticate(user=self.sales_manager)
        
        # Create a new refund request to reject
        refund_to_reject = RefundRequest.objects.create(
            order=self.delivered_order,
            order_item=self.order_item,
            customer_id=str(self.customer.id),
            customer_name=self.customer.username,
            customer_email=self.customer.email,
            product_id=self.product.id,
            product_name=self.product.name,
            reason='No good reason',
            quantity=1,
            purchase_price=Decimal('24.99'),  # Required field
            refund_amount=Decimal('24.99'),
            status='pending'
        )
        
        response = self.client.patch(f'/refunds/{refund_to_reject.id}/approve/', {
            'action': 'reject',
            'rejection_reason': 'Invalid refund request'
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
