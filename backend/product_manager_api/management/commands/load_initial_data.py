"""
Management command to load initial mock data into database
Run: python manage.py load_initial_data
"""
from django.core.management.base import BaseCommand
from product_manager_api.models import Product, Order
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'Load initial mock data into Product and Order tables'

    def handle(self, *args, **options):
        # Clear existing data (optional - comment out if you want to keep existing data)
        # Product.objects.all().delete()
        # Order.objects.all().delete()
        
        # Create Products
        products_data = [
            {
                "name": "Premium Dog Food",
                "model": "PDF-001",
                "serial_number": "SN-001",
                "description": "High-quality premium dog food with all natural ingredients.",
                "quantity_in_stock": 50,
                "price": 89.99,
                "warranty_status": "1 year warranty",
                "distributor": "Pet Supplies Co.",
                "category": "Food",
                "cost": 45.00
            },
            {
                "name": "Cat Litter Box",
                "model": "CLB-002",
                "serial_number": "SN-002",
                "description": "Modern, covered cat litter box with odor control.",
                "quantity_in_stock": 30,
                "price": 45.99,
                "warranty_status": "6 months warranty",
                "distributor": "Cat Care Products",
                "category": "Accessories",
                "cost": 23.00
            },
            {
                "name": "Bird Cage - Large",
                "model": "BC-LG-003",
                "serial_number": "SN-003",
                "description": "Spacious bird cage suitable for medium to large birds.",
                "quantity_in_stock": 15,
                "price": 129.99,
                "warranty_status": "2 years warranty",
                "distributor": "Avian Supplies Ltd.",
                "category": "Housing",
                "cost": 65.00
            },
        ]
        
        created_products = []
        for p_data in products_data:
            product, created = Product.objects.get_or_create(
                serial_number=p_data['serial_number'],
                defaults=p_data
            )
            created_products.append(product)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created product: {product.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'Product already exists: {product.name}'))
        
        # Create Orders
        orders_data = [
            {
                "delivery_id": "DEL-001",
                "customer_id": "CUST-001",
                "customer_name": "John Doe",
                "customer_email": "john@example.com",
                "product_id": created_products[0].id if created_products else 1,
                "product_name": "Premium Dog Food",
                "quantity": 2,
                "total_price": 179.98,
                "delivery_address": "123 Main St, Istanbul, Turkey",
                "status": "processing",
                "order_date": datetime.now().date() - timedelta(days=5),
            },
            {
                "delivery_id": "DEL-002",
                "customer_id": "CUST-002",
                "customer_name": "Jane Smith",
                "customer_email": "jane@example.com",
                "product_id": created_products[1].id if len(created_products) > 1 else 2,
                "product_name": "Cat Litter Box",
                "quantity": 1,
                "total_price": 45.99,
                "delivery_address": "456 Oak Ave, Ankara, Turkey",
                "status": "in-transit",
                "order_date": datetime.now().date() - timedelta(days=6),
                "delivery_date": datetime.now().date() + timedelta(days=1),
            },
            {
                "delivery_id": "DEL-003",
                "customer_id": "CUST-003",
                "customer_name": "Bob Wilson",
                "customer_email": "bob@example.com",
                "product_id": created_products[2].id if len(created_products) > 2 else 3,
                "product_name": "Bird Cage - Large",
                "quantity": 1,
                "total_price": 129.99,
                "delivery_address": "789 Pine Rd, Izmir, Turkey",
                "status": "delivered",
                "order_date": datetime.now().date() - timedelta(days=10),
                "delivery_date": datetime.now().date() - timedelta(days=2),
            },
        ]
        
        for o_data in orders_data:
            order, created = Order.objects.get_or_create(
                delivery_id=o_data['delivery_id'],
                defaults=o_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created order: {order.delivery_id}'))
            else:
                self.stdout.write(self.style.WARNING(f'Order already exists: {order.delivery_id}'))
        
        self.stdout.write(self.style.SUCCESS('\nInitial data loaded successfully!'))

