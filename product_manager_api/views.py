"""
Product Manager API Views
Handles product management, stock management, order management, and comment approval
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny  # TODO: Add proper authentication
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404
import json
from django.db.models import Avg, Q, Value
from django.db.models.functions import Coalesce
from django.db.models.functions import Coalesce
from django.db import transaction # Import transaction
from .models import Product # Import Product model
from django.views.decorators.csrf import csrf_exempt
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
from django.core.mail import EmailMessage

# Import Review and Order models
try:
    from .models import Review, Order, OrderItem, Category, Delivery
    USE_DATABASE = True
except ImportError:
    USE_DATABASE = False
    Review = None
    Order = None
    OrderItem = None
    Category = None

# Mock data - Will be replaced with database in future sprints
MOCK_PRODUCTS = [
    {
        "id": 1,
        "name": "Premium Dog Food",
        "model": "PDF-001",
        "serial_number": "SN-001",
        "description": "High-quality premium dog food with all natural ingredients.",
        "quantity_in_stock": 50,
        "price": 89.99,
        "warranty_status": "1 year warranty",
        "distributor": "Pet Supplies Co.",
        "category": "Food",
        "cost": 45.00  # 50% of sale price for loss/profit calculation
    },
    {
        "id": 2,
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
        "id": 3,
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

MOCK_ORDERS = [
    {
        "delivery_id": "DEL-001",
        "customer_id": "CUST-001",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "product_id": 1,
        "product_name": "Premium Dog Food",
        "quantity": 2,
        "total_price": 179.98,
        "delivery_address": "123 Main St, Istanbul, Turkey",
        "status": "processing",
        "order_date": "2024-01-15",
        "delivery_date": None
    },
    {
        "delivery_id": "DEL-002",
        "customer_id": "CUST-002",
        "customer_name": "Jane Smith",
        "customer_email": "jane@example.com",
        "product_id": 2,
        "product_name": "Cat Litter Box",
        "quantity": 1,
        "total_price": 45.99,
        "delivery_address": "456 Oak Ave, Ankara, Turkey",
        "status": "in-transit",
        "order_date": "2024-01-14",
        "delivery_date": "2024-01-20"
    },
    {
        "delivery_id": "DEL-003",
        "customer_id": "CUST-003",
        "customer_name": "Bob Wilson",
        "customer_email": "bob@example.com",
        "product_id": 3,
        "product_name": "Bird Cage - Large",
        "quantity": 1,
        "total_price": 129.99,
        "delivery_address": "789 Pine Rd, Izmir, Turkey",
        "status": "delivered",
        "order_date": "2024-01-10",
        "delivery_date": "2024-01-18"
    },
]

MOCK_COMMENTS = [
    {
        "id": 1,
        "product_id": 1,
        "product_name": "Premium Dog Food",
        "customer_name": "John Doe",
        "customer_email": "john@example.com",
        "rating": 5,
        "comment": "Great product! My dog loves it.",
        "status": "pending",
        "submitted_date": "2024-01-16"
    },
    {
        "id": 2,
        "product_id": 2,
        "product_name": "Cat Litter Box",
        "customer_name": "Jane Smith",
        "customer_email": "jane@example.com",
        "rating": 4,
        "comment": "Good quality, easy to clean.",
        "status": "approved",
        "submitted_date": "2024-01-15"
    },
    {
        "id": 3,
        "product_id": 3,
        "product_name": "Bird Cage - Large",
        "customer_name": "Bob Wilson",
        "customer_email": "bob@example.com",
        "rating": 5,
        "comment": "Perfect size for my parrot!",
        "status": "pending",
        "submitted_date": "2024-01-17"
    },
]

MOCK_CATEGORIES = ["Food", "Accessories", "Housing", "Toys", "Health"]

# Product Management
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def product_list_create(request):
    """Get all products or create a new product"""
    if request.method == 'GET':
        from urllib.parse import unquote
        # Get sort parameter
        sort_option = unquote(request.query_params.get('sort', '').strip().lower())
        category_filter = request.query_params.get('category')
        if category_filter:
            category_filter = unquote(category_filter).replace('&amp;', '&').strip()

        search_query = request.query_params.get('search')
        if search_query:
            search_query = unquote(search_query).strip()
        
        # Start with all products
        products_queryset = Product.objects.all()
        
        # Apply filtering
        if category_filter:
            products_queryset = products_queryset.filter(category__name=category_filter)
            
        if search_query:
            # Case-insensitive search on name and description
            products_queryset = products_queryset.filter(
                Q(name__icontains=search_query) | 
                Q(description__icontains=search_query)
            )
            
        products = []
        
        # Pre-fetch all reviews to avoid N+1 queries
        # We need ALL reviews (pending, approved, rejected) for the popularity sort as requested
        product_ratings = {}
        if USE_DATABASE and Review:
            all_reviews = Review.objects.all().values('product_id', 'rating')
            for r in all_reviews:
                pid = r['product_id']
                if pid not in product_ratings:
                    product_ratings[pid] = []
                product_ratings[pid].append(r['rating'])
        
        # Convert to dictionary format
        for p in products_queryset:
            # Calculate average rating from pre-fetched data
            ratings = product_ratings.get(p.id, [])
            avg_rating = sum(ratings) / len(ratings) if ratings else 0.0
            rating_count = len(ratings)

            # Handle category ForeignKey
            category_name = ''
            if p.category:
                category_name = p.category.name

            products.append({
                "id": p.id,
                "name": p.name,
                "model": p.model,
                "serial_number": p.serial_number,
                "description": p.description,
                "quantity_in_stock": p.quantity_in_stock,
                "price": float(p.price),
                "warranty_status": p.warranty_status,
                "distributor": p.distributor,
                "category": category_name,
                "cost": float(p.cost) if p.cost else None,
                "image_url": p.image_url if p.image_url else "https://via.placeholder.com/300x300?text=Product",
                "average_rating": float(avg_rating),
                "rating_count": rating_count
            })

        # Apply sorting
        if sort_option == 'price':
            # Sort by price ascending, then by name
            products.sort(key=lambda p: (float(p.get('price', 0)), p.get('name', '').lower()))
        elif sort_option == 'price-desc':
            # Sort by price descending, then by name
            products.sort(key=lambda p: (float(p.get('price', 0)), p.get('name', '').lower()), reverse=True)
        elif sort_option == 'popularity':
            # Sort by average_rating descending, then by rating_count descending, then by name
            products.sort(key=lambda p: (
                float(p.get('average_rating', 0) or 0),
                p.get('rating_count', 0),
                p.get('name', '').lower()
            ), reverse=True)
        
        return Response({
            'products': products,
            'count': len(products)
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Create new product
        try:
            # Handle category lookup
            category_name = request.data.get('category', '')
            category_obj = None
            if category_name and USE_DATABASE and Category:
                category_obj = Category.objects.filter(name=category_name).first()
                if not category_obj:
                     # Optional: Create if not exists, or return error. User said "categories exist"
                     # sticking to safe side: if not found, leave None or create?
                     # Let's create it to be safe and consistent with previous behavior
                     category_obj = Category.objects.create(name=category_name)

            # Handle file upload
            image_url = request.data.get('image_url', '')
            if 'image' in request.FILES:
                image_file = request.FILES['image']
                from django.core.files.storage import FileSystemStorage
                fs = FileSystemStorage(location='media/products', base_url='/media/products/')
                filename = fs.save(image_file.name, image_file)
                image_url = fs.url(filename)

            p = Product.objects.create(
                name=request.data.get('name'),
                model=request.data.get('model', ''),
                serial_number=request.data.get('serial_number', ''),
                description=request.data.get('description', ''),
                quantity_in_stock=int(request.data.get('quantity_in_stock', 0)),
                price=float(request.data.get('price', 0)),
                warranty_status=request.data.get('warranty_status', ''),
                distributor=request.data.get('distributor', ''),
                category=category_obj,
                cost=float(request.data.get('cost')) if request.data.get('cost') else None,
                image_url=image_url
            )
            
            new_product = {
                "id": p.id,
                "name": p.name,
                "model": p.model,
                "serial_number": p.serial_number,
                "description": p.description,
                "quantity_in_stock": p.quantity_in_stock,
                "price": float(p.price),
                "warranty_status": p.warranty_status,
                "distributor": p.distributor,
                "category": p.category.name if p.category else None,
                "cost": float(p.cost) if p.cost else None,
                "image_url": p.image_url
            }
            return Response(new_product, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def product_detail(request, product_id):
    """Get, update, or delete a specific product"""
    product = get_object_or_404(Product, id=product_id)
    
    if request.method == 'GET':
        category_name = ''
        if product.category:
            category_name = product.category.name

        product_data = {
            "id": product.id,
            "name": product.name,
            "model": product.model,
            "serial_number": product.serial_number,
            "description": product.description,
            "quantity_in_stock": product.quantity_in_stock,
            "price": float(product.price),
            "warranty_status": product.warranty_status,
            "distributor": product.distributor,
            "category": category_name,
            "cost": float(product.cost) if product.cost else None,
            "image_url": product.image_url if product.image_url else "https://via.placeholder.com/300x300?text=Product"
        }
        return Response(product_data, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        # Update product
        try:
            if 'name' in request.data: product.name = request.data['name']
            if 'description' in request.data: product.description = request.data['description']
            if 'price' in request.data: product.price = float(request.data['price'])
            if 'quantity_in_stock' in request.data: product.quantity_in_stock = int(request.data['quantity_in_stock'])
            if 'image_url' in request.data: product.image_url = request.data['image_url']
            
            if 'image' in request.FILES:
                image_file = request.FILES['image']
                from django.core.files.storage import FileSystemStorage
                fs = FileSystemStorage(location='media/products', base_url='/media/products/')
                filename = fs.save(image_file.name, image_file)
                product.image_url = fs.url(filename)
            
            if 'category' in request.data and USE_DATABASE and Category:
                category_name = request.data['category']
                category_obj = Category.objects.filter(name=category_name).first()
                if not category_obj:
                    category_obj = Category.objects.create(name=category_name)
                product.category = category_obj
            # Add other fields as needed
            
            product.save()
            
            product_data = {
                "id": product.id,
                "name": product.name,
                "quantity_in_stock": product.quantity_in_stock,
                "price": float(product.price),
                "image_url": product.image_url,
                # ...
            }
            return Response(product_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        product.delete()
        return Response(
            {'message': 'Product deleted successfully'},
            status=status.HTTP_200_OK
        )

# Category Management
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def category_list_create(request):
    """Get all categories or create a new category"""
    if request.method == 'GET':
        if USE_DATABASE and Category:
            categories = list(Category.objects.values_list('name', flat=True))
        else:
            categories = MOCK_CATEGORIES
            
        return Response({
            'categories': categories,
            'count': len(categories)
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        category_name = request.data.get('name')
        if not category_name:
             return Response(
                {'error': 'Category name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if USE_DATABASE and Category:
            if Category.objects.filter(name=category_name).exists():
                return Response(
                    {'error': 'Category already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            Category.objects.create(name=category_name)
            return Response(
                {'message': 'Category created', 'category': category_name},
                status=status.HTTP_201_CREATED
            )
        else:
            # Fallback to mock
            if category_name in MOCK_CATEGORIES:
                 return Response(
                    {'error': 'Category already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            MOCK_CATEGORIES.append(category_name)
            return Response(
                {'message': 'Category created', 'category': category_name},
                status=status.HTTP_201_CREATED
            )

@api_view(['DELETE'])
@permission_classes([AllowAny])
def category_delete(request, category_name):
    """Delete a category"""
    if USE_DATABASE and Category:
        try:
            cat = Category.objects.get(name=category_name)
            cat.delete()
            return Response(
                {'message': 'Category deleted successfully'},
                status=status.HTTP_200_OK
            )
        except Category.DoesNotExist:
            return Response(
                {'error': 'Category not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        # Fallback
        if category_name in MOCK_CATEGORIES:
            MOCK_CATEGORIES.remove(category_name)
            return Response(
                {'message': 'Category deleted successfully'},
                status=status.HTTP_200_OK
            )
        return Response(
            {'error': 'Category not found'},
            status=status.HTTP_404_NOT_FOUND
        )

# Stock Management
@api_view(['GET'])
@permission_classes([AllowAny])
def stock_list(request):
    """Get stock status for all products"""
    products = Product.objects.all()
    stock_data = [
        {
            'product_id': p.id,
            'product_name': p.name,
            'quantity_in_stock': p.quantity_in_stock,
            'low_stock': p.quantity_in_stock < 10,
            'out_of_stock': p.quantity_in_stock == 0
        }
        for p in products
    ]
    return Response({'stock': stock_data}, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([AllowAny])
def stock_update(request, product_id):
    """Update stock quantity for a product"""
    product = get_object_or_404(Product, id=product_id)
    
    new_quantity = request.data.get('quantity_in_stock')
    if new_quantity is not None:
        try:
            product.quantity_in_stock = int(new_quantity)
            product.save()
            return Response({
                "id": product.id,
                "name": product.name,
                "quantity_in_stock": product.quantity_in_stock,
            }, status=status.HTTP_200_OK)
        except ValueError:
            return Response(
                {'error': 'Invalid quantity'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    return Response(
        {'error': 'Quantity not provided'},
        status=status.HTTP_400_BAD_REQUEST
    )

# Order/Delivery Management
@api_view(['GET'])
@permission_classes([AllowAny])
def order_list(request):
    """Get all orders/deliveries"""
    status_filter = request.query_params.get('status')
    email_filter = request.query_params.get('email')
    product_filter = request.query_params.get('product_id')
    
    if USE_DATABASE and Order:
        orders_query = Order.objects.all().prefetch_related('items').order_by('-order_date', '-created_at')
        if status_filter:
            orders_query = orders_query.filter(status=status_filter)
        if email_filter:
            orders_query = orders_query.filter(customer_email=email_filter)
        # product_filter might be tricky now since it's in items.
        if product_filter:
             orders_query = orders_query.filter(items__product_id=product_filter).distinct()
        
        date_filter = request.query_params.get('date')
        if date_filter == 'today':
            orders_query = orders_query.filter(order_date=timezone.now().date())
        elif date_filter == 'week':
            seven_days_ago = timezone.now().date() - timezone.timedelta(days=7)
            orders_query = orders_query.filter(order_date__gte=seven_days_ago)
            
        orders_data = [{
            'delivery_id': o.delivery_id,
            'customer_id': o.customer_id,
            'customer_name': o.customer_name,
            'customer_email': o.customer_email,
            'items': [{
                'id': item.id,
                'product_id': item.product_id,
                'product_name': item.product_name,
                'quantity': item.quantity,
                'price': float(item.price)
            } for item in o.items.all()],
            'total_price': float(o.total_price),
            'delivery_address': o.delivery_address,
            'status': o.status,
            'order_date': o.order_date.strftime('%Y-%m-%d'),
            'delivery_date': o.delivery_date.strftime('%Y-%m-%d') if o.delivery_date else None,
            'created_at': o.created_at.isoformat() if hasattr(o, 'created_at') else None,
        } for o in orders_query]
        
        return Response({
            'orders': orders_data,
            'count': len(orders_data)
        }, status=status.HTTP_200_OK)

    # Fallback to mock data
    orders = MOCK_ORDERS.copy()
    if status_filter:
        orders = [o for o in orders if o['status'] == status_filter]
    
    return Response({
        'orders': orders,
        'count': len(orders)
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def order_detail(request, delivery_id):
    """Get specific order details"""
    if USE_DATABASE and Order:
        try:
            order = Order.objects.prefetch_related('items').get(delivery_id=delivery_id)
            return Response({
                "delivery_id": order.delivery_id,
                "customer_id": order.customer_id,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "items": [{
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "price": float(item.price)
                } for item in order.items.all()],
                "total_price": float(order.total_price),
                "delivery_address": order.delivery_address,
                "status": order.status,
                "order_date": order.order_date.strftime('%Y-%m-%d') if order.order_date else None,
                "delivery_date": order.delivery_date.strftime('%Y-%m-%d') if order.delivery_date else None,
                "created_at": order.created_at.isoformat() if hasattr(order, 'created_at') else None,
            }, status=status.HTTP_200_OK)
        except Order.DoesNotExist:
            pass # Fall through to mock data

    # Fallback to mock data
    order = next((o for o in MOCK_ORDERS if o['delivery_id'] == delivery_id), None)
    
    if not order:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response(order, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def order_history(request):
    """Get order history for a specific user by email"""
    email = request.query_params.get('email')
    
    if not email:
        return Response(
            {'error': 'Email parameter is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Database check handled globally
    USE_ORDER_DB = USE_DATABASE
    
    if USE_DATABASE and Order:
        # Use database
        try:
            orders_query = Order.objects.filter(customer_email=email).prefetch_related('items').order_by('-order_date', '-created_at')
            
            orders_data = [{
                'delivery_id': o.delivery_id,
                'customer_id': o.customer_id,
                'customer_name': o.customer_name,
                'customer_email': o.customer_email,
                'items': [{
                    'id': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': float(item.price)
                } for item in o.items.all()],
                'total_price': float(o.total_price),
                'delivery_address': o.delivery_address,
                'status': o.status,
                'order_date': o.order_date.strftime('%Y-%m-%d'),
                'delivery_date': o.delivery_date.strftime('%Y-%m-%d') if o.delivery_date else None,
                'created_at': o.created_at.isoformat() if hasattr(o, 'created_at') else None,
            } for o in orders_query]
        except Exception as e:
            print(f"Error fetching order history: {e}")
            orders_data = [] # Fallback or return error?
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        # Use mock data
        orders_data = [
            {
                'delivery_id': o.get('delivery_id', ''),
                'customer_id': o.get('customer_id', ''),
                'customer_name': o.get('customer_name', ''),
                'customer_email': o.get('customer_email', ''),
                'product_id': o.get('product_id', 0),
                'product_name': o.get('product_name', ''),
                'quantity': o.get('quantity', 0),
                'total_price': float(o.get('total_price', 0)),
                'delivery_address': o.get('delivery_address', ''),
                'status': o.get('status', 'processing'),
                'order_date': o.get('order_date', ''),
                'delivery_date': o.get('delivery_date'),
            }
            for o in MOCK_ORDERS if o.get('customer_email', '').lower() == email.lower()
        ]
    
    return Response({
        'orders': orders_data,
        'count': len(orders_data)
    }, status=status.HTTP_200_OK)

from django.views.decorators.csrf import csrf_exempt

@api_view(['PUT'])
@permission_classes([AllowAny])
@csrf_exempt
def order_update_status(request, delivery_id):
    """Update order status (processing, in-transit, delivered)"""
    new_status = request.data.get('status')
    valid_statuses = ['processing', 'in-transit', 'delivered']
    
    if new_status not in valid_statuses:
        return Response(
            {'error': f'Invalid status. Must be one of: {valid_statuses}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if USE_DATABASE and Order:
        try:
            order = Order.objects.get(delivery_id=delivery_id)
            order.status = new_status
            
            if new_status == 'delivered' and not order.delivery_date:
                from django.utils import timezone
                order.delivery_date = timezone.now().date()
            
            # Sync Delivery table status
            # If order is delivered, mark all delivery items as completed
            # If status changed away from delivered, mark as incomplete
            is_completed = (new_status == 'delivered')
            Delivery.objects.filter(order=order).update(is_completed=is_completed)
            
            order.save()
            
            return Response({
                "delivery_id": order.delivery_id,
                "customer_id": order.customer_id,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "items": [{
                    "product_id": item.product_id,
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "price": float(item.price)
                } for item in order.items.all()],
                "total_price": float(order.total_price),
                "delivery_address": order.delivery_address,
                "status": order.status,
                "order_date": order.order_date.strftime('%Y-%m-%d') if order.order_date else None,
                "delivery_date": order.delivery_date.strftime('%Y-%m-%d') if order.delivery_date else None,
            }, status=status.HTTP_200_OK)
            
        except Order.DoesNotExist:
            pass # Fall through to mock data check if not in DB for some reason

    # Fallback to mock data
    order = next((o for o in MOCK_ORDERS if o['delivery_id'] == delivery_id), None)
    
    if not order:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    order['status'] = new_status
    if new_status == 'delivered' and not order.get('delivery_date'):
        from datetime import datetime
        order['delivery_date'] = datetime.now().strftime('%Y-%m-%d')
        
    return Response(order, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def review_create(request):
    """Create a new review/comment"""
    if not USE_DATABASE or not Review:
        # Fallback to mock data
        new_review = {
            'id': len(MOCK_COMMENTS) + 1,
            **request.data,
            'status': 'pending',
            'submitted_date': timezone.now().strftime('%Y-%m-%d')
        }
        MOCK_COMMENTS.append(new_review)
        return Response(new_review, status=status.HTTP_201_CREATED)
    
    try:
        user_email = request.data.get('user_email') or request.data.get('userEmail')
        product_id = request.data.get('product_id') or request.data.get('productId')
        
        # Validation: Check if user has purchased this product and it is delivered
        if not Order.objects.filter(
            customer_email=user_email,
            items__product_id=product_id,
            status='delivered'
        ).exists():
            return Response(
                {'error': 'You can review products you bought after they are delivered.'},
                status=status.HTTP_403_FORBIDDEN
            )

        review = Review.objects.create(
            product_id=product_id,
            product_name=request.data.get('product_name') or request.data.get('productName', ''),
            user_id=str(request.data.get('user_id') or request.data.get('userId', '')),
            user_name=request.data.get('user_name') or request.data.get('userName', ''),
            user_email=user_email,
            rating=request.data.get('rating', 5),
            comment=request.data.get('comment', ''),
            status='pending'
        )
        
        return Response({
            'id': review.id,
            'product_id': review.product_id,
            'product_name': review.product_name,
            'user_id': review.user_id,
            'user_name': review.user_name,
            'user_email': review.user_email,
            'rating': review.rating,
            'comment': review.comment,
            'status': review.status,
            'created_at': review.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {'error': f'Error creating review: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['GET'])
@permission_classes([AllowAny])
def comment_list(request):
    """Get all comments (pending and approved)"""
    status_filter = request.query_params.get('status')
    
    if USE_DATABASE and Review:
        reviews_query = Review.objects.all()
        if status_filter:
            reviews_query = reviews_query.filter(status=status_filter)
        
        comments = [{
            'id': r.id,
            'product_id': r.product_id,
            'product_name': r.product_name,
            'productName': r.product_name,
            'user_id': r.user_id,
            'user_name': r.user_name,
            'userName': r.user_name,
            'user_email': r.user_email,
            'userEmail': r.user_email,
            'rating': r.rating,
            'comment': r.comment,
            'status': r.status,
            'date': r.created_at.isoformat(),
            'created_at': r.created_at.isoformat(),
        } for r in reviews_query]
        
        pending_count = Review.objects.filter(status='pending').count()
    else:
        # Fallback to mock data
        comments = MOCK_COMMENTS.copy()
        if status_filter:
            comments = [c for c in comments if c['status'] == status_filter]
        pending_count = len([c for c in MOCK_COMMENTS if c['status'] == 'pending'])
    
    return Response({
        'comments': comments,
        'count': len(comments),
        'pending_count': pending_count
    }, status=status.HTTP_200_OK)

@csrf_exempt
@api_view(['PUT'])
@permission_classes([AllowAny])
def comment_approve(request, comment_id):
    """Approve or reject a comment"""
    if USE_DATABASE and Review:
        try:
            review = Review.objects.get(id=comment_id)
        except Review.DoesNotExist:
            return Response(
                {'error': 'Comment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        action = request.data.get('action')
        
        if action == 'approve':
            review.status = 'approved'
            review.save()
            return Response({
                'message': 'Comment approved',
                'comment': {
                    'id': review.id,
                    'product_id': review.product_id,
                    'product_name': review.product_name,
                    'user_name': review.user_name,
                    'user_email': review.user_email,
                    'rating': review.rating,
                    'comment': review.comment,
                    'status': review.status,
                    'created_at': review.created_at.isoformat(),
                }
            }, status=status.HTTP_200_OK)
        
        elif action == 'reject':
            review.status = 'rejected'
            review.save()
            return Response({
                'message': 'Comment rejected',
                'comment': {
                    'id': review.id,
                    'product_id': review.product_id,
                    'product_name': review.product_name,
                    'user_name': review.user_name,
                    'user_email': review.user_email,
                    'rating': review.rating,
                    'comment': review.comment,
                    'status': review.status,
                    'created_at': review.created_at.isoformat(),
                }
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'error': 'Invalid action. Use "approve" or "reject"'},
            status=status.HTTP_400_BAD_REQUEST
        )
    else:
        # Fallback to mock data
        comment = next((c for c in MOCK_COMMENTS if c['id'] == comment_id), None)
        
        if not comment:
            return Response(
                {'error': 'Comment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        action = request.data.get('action')
        
        if action == 'approve':
            comment['status'] = 'approved'
            return Response({
                'message': 'Comment approved',
                'comment': comment
            }, status=status.HTTP_200_OK)
        
        elif action == 'reject':
            comment['status'] = 'rejected'
            return Response({
                'message': 'Comment rejected',
                'comment': comment
            }, status=status.HTTP_200_OK)
        
        return Response(
            {'error': 'Invalid action. Use "approve" or "reject"'},
            status=status.HTTP_400_BAD_REQUEST
        )

# Dashboard Stats
@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """Get dashboard statistics"""
    if USE_DATABASE and Product:
        total_products = Product.objects.count()
        low_stock_products = Product.objects.filter(quantity_in_stock__lt=10, quantity_in_stock__gt=0).count()
        out_of_stock_products = Product.objects.filter(quantity_in_stock__lte=0).count()
        total_orders = Order.objects.count()
        processing_orders = Order.objects.filter(status='processing').count()
        in_transit_orders = Order.objects.filter(status='in-transit').count()
        delivered_orders = Order.objects.filter(status='delivered').count()
        pending_comments = Review.objects.filter(status='pending').count()
        total_categories = Category.objects.count()
    else:
        total_products = len(MOCK_PRODUCTS)
        low_stock_products = len([p for p in MOCK_PRODUCTS if p['quantity_in_stock'] < 10 and p['quantity_in_stock'] > 0])
        out_of_stock_products = len([p for p in MOCK_PRODUCTS if p['quantity_in_stock'] <= 0])
        total_orders = len(MOCK_ORDERS)
        processing_orders = len([o for o in MOCK_ORDERS if o['status'] == 'processing'])
        in_transit_orders = len([o for o in MOCK_ORDERS if o['status'] == 'in-transit'])
        delivered_orders = len([o for o in MOCK_ORDERS if o['status'] == 'delivered'])
        pending_comments = len([c for c in MOCK_COMMENTS if c['status'] == 'pending'])
        total_categories = len(MOCK_CATEGORIES)

    return Response({
        'total_products': total_products,
        'low_stock_products': low_stock_products,
        'out_of_stock_products': out_of_stock_products,
        'total_orders': total_orders,
        'processing_orders': processing_orders,
        'in_transit_orders': in_transit_orders,
        'delivered_orders': delivered_orders,
        'pending_comments': pending_comments,
        'total_categories': total_categories
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def delivery_dashboard_stats(request):
    """Return delivery department dashboard statistics"""
    from django.db.models import Sum
    from datetime import timedelta
    
    # Try to use database Order model, fallback to MOCK_ORDERS
    
    # Use global database flag
    if USE_DATABASE and Order:
        # Use database
        total_orders = Order.objects.count()
        processing_orders = Order.objects.filter(status='processing').count()
        in_transit_orders = Order.objects.filter(status='in-transit').count()
        delivered_orders = Order.objects.filter(status='delivered').count()
        
        today = timezone.now().date()
        today_orders = Order.objects.filter(order_date=today).count()
        pending_deliveries = processing_orders + in_transit_orders
        
        delivered_revenue = Order.objects.filter(status='delivered').aggregate(
            total=Sum('total_price')
        )['total'] or 0
        
        delivered_with_date = Order.objects.filter(
            status='delivered',
            delivery_date__isnull=False
        )
        
        avg_delivery_days = None
        if delivered_with_date.exists():
            total_days = 0
            count = 0
            for order in delivered_with_date:
                if order.delivery_date and order.order_date:
                    days = (order.delivery_date - order.order_date).days
                    if days >= 0:
                        total_days += days
                        count += 1
            if count > 0:
                avg_delivery_days = round(total_days / count, 1)
        
        seven_days_ago = today - timedelta(days=7)
        recent_orders = Order.objects.filter(order_date__gte=seven_days_ago).count()
        
        two_days_ago = today - timedelta(days=2)
        urgent_orders = Order.objects.filter(
            status='processing',
            order_date__lt=two_days_ago
        ).count()
    else:
        # Use mock data
        total_orders = len(MOCK_ORDERS)
        processing_orders = len([o for o in MOCK_ORDERS if o.get('status') == 'processing'])
        in_transit_orders = len([o for o in MOCK_ORDERS if o.get('status') == 'in-transit'])
        delivered_orders = len([o for o in MOCK_ORDERS if o.get('status') == 'delivered'])
        pending_deliveries = processing_orders + in_transit_orders
        
        today = timezone.now().date()
        today_str = today.strftime('%Y-%m-%d')
        today_orders = len([o for o in MOCK_ORDERS if o.get('order_date') == today_str])
        
        delivered_revenue = sum(float(o.get('total_price', 0)) for o in MOCK_ORDERS if o.get('status') == 'delivered')
        
        # Calculate average delivery days from mock data
        delivered_with_dates = [o for o in MOCK_ORDERS if o.get('status') == 'delivered' and o.get('delivery_date') and o.get('order_date')]
        avg_delivery_days = None
        if delivered_with_dates:
            total_days = 0
            for order in delivered_with_dates:
                try:
                    from datetime import datetime
                    order_date = datetime.strptime(order['order_date'], '%Y-%m-%d').date()
                    delivery_date = datetime.strptime(order['delivery_date'], '%Y-%m-%d').date()
                    days = (delivery_date - order_date).days
                    if days >= 0:
                        total_days += days
                except:
                    pass
            if len(delivered_with_dates) > 0:
                avg_delivery_days = round(total_days / len(delivered_with_dates), 1)
        
        seven_days_ago = today - timedelta(days=7)
        from datetime import datetime as dt
        recent_orders = len([o for o in MOCK_ORDERS if o.get('order_date') and dt.strptime(o['order_date'], '%Y-%m-%d').date() >= seven_days_ago])
        
        two_days_ago = today - timedelta(days=2)
        urgent_orders = len([o for o in MOCK_ORDERS if o.get('status') == 'processing' and o.get('order_date') and dt.strptime(o['order_date'], '%Y-%m-%d').date() < two_days_ago])
    
    data = {
        "total_orders": total_orders,
        "processing_orders": processing_orders,
        "in_transit_orders": in_transit_orders,
        "delivered_orders": delivered_orders,
        "pending_deliveries": pending_deliveries,
        "today_orders": today_orders,
        "recent_orders": recent_orders,
        "urgent_orders": urgent_orders,
        "delivered_revenue": float(delivered_revenue),
        "avg_delivery_days": avg_delivery_days,
    }
    
    return Response(data, status=status.HTTP_200_OK)

# =============================
# Create Order (Frontend Checkout)
# =============================
# Invoice functions are now in this file, no need to import from api.views
from datetime import datetime, date, timedelta
import uuid

@api_view(['POST'])
@permission_classes([AllowAny])
def create_order(request):
    """Create a new order from checkout"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        data = request.data
        
        # Validate required top-level fields
        required_fields = ["customer_name", "customer_email", "total_price", "delivery_address", "items"]

        # missing field check
        for field in required_fields:
            if field not in data:
                return Response(
                    {"error": f"Missing field: {field}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        items = data.get('items', [])
        if not items or not isinstance(items, list):
             return Response(
                {"error": "items field must be a non-empty list"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create delivery/order id
        delivery_id = f"DEL-{uuid.uuid4().hex[:6].upper()}"
        if request.user.is_authenticated:
            customer_id = str(request.user.id)
        else:
            # Try to match by email if not authenticated but user exists? 
            # Or just random. User said "djangodan gerçek id". 
            # If not logged in, random is the best we can do unless we lookup email.
            # Let's check email lookup too for robustness, consistent with Delivery creation logic below.
            from django.contrib.auth.models import User
            user_by_email = User.objects.filter(email=data.get("customer_email")).first()
            if user_by_email:
                customer_id = str(user_by_email.id)
            else:
                customer_id = f"CUST-{uuid.uuid4().hex[:6].upper()}"
        
        order_date = date.today()

        # Try to save to database first
        if USE_DATABASE and Order:
            with transaction.atomic():
                # 1. Create Order
                order = Order.objects.create(
                    delivery_id=delivery_id,
                    customer_id=customer_id,
                    customer_name=data["customer_name"],
                    customer_email=data["customer_email"],
                    total_price=data["total_price"],
                    delivery_address=data["delivery_address"],
                    status="processing",
                    order_date=order_date,
                    delivery_date=None
                )
                
                order_items_data = []

                # 2. Process Items
                for item in items:
                    product_id = item.get("product_id")
                    quantity_ordered = int(item.get("quantity", 1))
                    price = float(item.get("price", 0)) # Should theoretically come from backend for security, but using payload for now
                    product_name = item.get("product_name", "Unknown Product")

                    # If product_id is provided, use it.
                    product_obj = None
                    if product_id:
                        try:
                            product_obj = Product.objects.select_for_update().get(id=product_id)
                        except Product.DoesNotExist:
                             # Should we fail the whole order? Yes.
                             raise Exception(f"Product with id {product_id} not found.")
                    
                    # Decrease stock/validate
                    if product_obj:
                        if product_obj.quantity_in_stock >= quantity_ordered:
                            product_obj.quantity_in_stock -= quantity_ordered
                            product_obj.save()
                        else:
                            # Rollback transaction
                             raise Exception(f"Insufficient stock for {product_obj.name}. Available: {product_obj.quantity_in_stock}")
                    
                    # Create OrderItem
                    OrderItem.objects.create(
                        order=order,
                        product_id=product_id or 0,
                        product_name=product_name,
                        quantity=quantity_ordered,
                        price=price
                    )
                    
                    # Create Delivery Record linked to foreign keys
                    # Check if user is authenticated for customer FK
                    customer_user = None
                    if request.user.is_authenticated:
                        customer_user = request.user
                    else:
                        # Fallback: Try to find user by email
                         try:
                             from django.contrib.auth.models import User
                             customer_user = User.objects.filter(email=data.get("customer_email")).first()
                         except:
                             customer_user = None
                    
                    Delivery.objects.create(
                        order=order,
                        customer=customer_user,
                        product=product_obj, 
                        quantity=quantity_ordered,
                        total_price=price * quantity_ordered,
                        delivery_address=data["delivery_address"],
                        is_completed=False
                    )

                    order_items_data.append({
                        "product_id": product_id,
                        "product_name": product_name,
                        "quantity": quantity_ordered,
                        "price": price
                    })


            
            # Convert to dict for response
            new_order = {
                "delivery_id": order.delivery_id,
                "customer_id": order.customer_id,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "items": order_items_data,
                "total_price": float(order.total_price),
                "delivery_address": order.delivery_address,
                "status": order.status,
                "order_date": order.order_date.strftime("%Y-%m-%d") if order.order_date else None,
                "delivery_date": order.delivery_date.strftime("%Y-%m-%d") if order.delivery_date else None,
            }
            
            return Response(
                {"message": "Order created successfully", "order": new_order},
                status=status.HTTP_201_CREATED
            )
        
        # Fallback to mock data (only if DB not available)
        new_order = {
            "delivery_id": delivery_id,
            "customer_id": customer_id,
            "customer_name": data["customer_name"],
            "customer_email": data["customer_email"],
            "items": items,
            "total_price": data["total_price"],
            "delivery_address": data["delivery_address"],
            "status": "processing",
            "order_date": order_date.strftime("%Y-%m-%d"),
            "delivery_date": None
        }
        return Response(
            {"message": "Order created (MOCK)", "order": new_order},
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        import traceback
        # If transaction raises exception, it's caught here and response is 500 or 400
        # If stock check failed (custom logic), we might want 400.
        err_msg = str(e)
        if "Insufficient stock" in err_msg:
             return Response({"error": err_msg}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"error": err_msg, "trace": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Add order to mock DB
    MOCK_ORDERS.append(new_order)

    # Send email invoice
    try:
        send_invoice_email(new_order)
    except Exception as e:
        print("Email error:", e)

    return Response(
        {"message": "Order created successfully", "order": new_order},
        status=status.HTTP_201_CREATED
    )

# =============================
# Order History (User Orders)
# =============================
@api_view(['GET'])
@permission_classes([AllowAny])
def user_order_history(request):
    """Get order history for the current user by email"""
    user_email = request.query_params.get('email')
    
    if not user_email:
        return Response(
            {"error": "Email parameter is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Try to get orders from database first
    if USE_DATABASE and Order:
        try:
            orders = Order.objects.filter(customer_email=user_email).prefetch_related('items').order_by('-order_date', '-created_at')
            orders_data = [{
                'delivery_id': order.delivery_id,
                'customer_id': order.customer_id,
                'customer_name': order.customer_name,
                'customer_email': order.customer_email,
                'items': [{
                    'product_id': item.product_id,
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': float(item.price)
                } for item in order.items.all()],
                'total_price': float(order.total_price),
                'delivery_address': order.delivery_address,
                'status': order.status,
                'order_date': order.order_date.strftime('%Y-%m-%d') if order.order_date else None,
                'delivery_date': order.delivery_date.strftime('%Y-%m-%d') if order.delivery_date else None,
                'created_at': order.created_at.isoformat() if order.created_at else None,
            } for order in orders]
            
            return Response({
                'orders': orders_data,
                'count': len(orders_data)
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Database error: {e}")
            # Fall through to mock data
    
    # Fallback to mock data
    user_orders = [o for o in MOCK_ORDERS if o.get('customer_email', '').lower() == user_email.lower()]
    
    return Response({
        'orders': user_orders,
        'count': len(user_orders)
    }, status=status.HTTP_200_OK)


# =============================
# Sales Manager Endpoints
# =============================

@api_view(['POST'])
@permission_classes([AllowAny])
def set_product_discount(request):
    """Set discount on selected products"""
    try:
        data = request.data
        product_ids = data.get('product_ids', [])
        discount_rate = data.get('discount_rate', 0)
        discount_start_date = data.get('discount_start_date')
        discount_end_date = data.get('discount_end_date')
        
        if not product_ids:
            return Response(
                {'error': 'product_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not (0 <= discount_rate <= 100):
            return Response(
                {'error': 'discount_rate must be between 0 and 100'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not discount_start_date or not discount_end_date:
            return Response(
                {'error': 'discount_start_date and discount_end_date are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Parse dates
        try:
            start_date = datetime.strptime(discount_start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(discount_end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if start_date > end_date:
            return Response(
                {'error': 'discount_start_date must be before discount_end_date'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_products = []
        notified_users = []
        
        if not USE_DATABASE or not Product:
            return Response(
                {'error': 'Database not available'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        with transaction.atomic():
            for product_id in product_ids:
                try:
                    product = Product.objects.get(id=product_id)
                    
                    # Save original price if not already saved
                    if not product.original_price:
                        product.original_price = product.price
                    
                    # Set discount
                    product.discount_rate = discount_rate
                    product.discount_start_date = start_date
                    product.discount_end_date = end_date
                    
                    # Calculate new price (use original_price or current price)
                    base_price = float(product.original_price) if product.original_price else float(product.price)
                    new_price = base_price * (1 - float(discount_rate) / 100)
                    product.price = new_price
                    product.save()
                    
                    updated_products.append({
                        'id': product.id,
                        'name': product.name,
                        'original_price': float(product.original_price) if product.original_price else float(product.price),
                        'new_price': float(product.price),
                        'discount_rate': float(discount_rate)
                    })
                    
                    # Notify users who have this product in their wishlist
                    try:
                        from api.models import WishlistItem
                        from django.contrib.auth.models import User
                        from django.core.mail import send_mail
                        from django.conf import settings
                        
                        wishlist_items = WishlistItem.objects.filter(product_id=product_id)
                        for wishlist_item in wishlist_items:
                            user = wishlist_item.wishlist.user
                            if user.email:
                                try:
                                    send_mail(
                                        subject=f'Discount Alert: {product.name}',
                                        message=f'Great news! {product.name} is now {discount_rate}% off!\n\n'
                                               f'Original Price: {product.original_price} TL\n'
                                               f'New Price: {product.price} TL\n'
                                               f'Discount Period: {start_date} to {end_date}',
                                        from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@petstore.com',
                                        recipient_list=[user.email],
                                        fail_silently=True
                                    )
                                    notified_users.append(user.email)
                                except Exception as e:
                                    print(f"Failed to send email to {user.email}: {e}")
                    except Exception as e:
                        print(f"Error notifying wishlist users: {e}")
                
                except Product.DoesNotExist:
                    continue
                except Exception as e:
                    print(f"Error processing product {product_id}: {e}")
                    continue
        
        if not updated_products:
            return Response(
                {'error': 'No products were updated. Please check if product IDs are valid.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'message': 'Discount applied successfully',
            'updated_products': updated_products,
            'notified_users_count': len(notified_users),
            'notified_users': notified_users
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'trace': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========== ORDER CANCELLATION ==========

@api_view(['POST'])
@permission_classes([AllowAny])
def cancel_order(request, delivery_id):
    """Cancel an order (only if status is 'processing')"""
    try:
        data = request.data
        customer_email = data.get('customer_email')
        
        if not customer_email:
            return Response(
                {'error': 'customer_email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not USE_DATABASE or not Order:
            return Response(
                {'error': 'Database not available'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Get order
        try:
            order = Order.objects.get(delivery_id=delivery_id, customer_email=customer_email)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if order is in 'processing' status
        if order.status != 'processing':
            return Response(
                {'error': f'Order can only be cancelled if it is in "processing" status. Current status: {order.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cancel the order
        order.status = 'cancelled'
        order.save()
        
        # Return products to stock
        try:
            for item in order.items.all():
                try:
                    product = Product.objects.select_for_update().get(id=item.product_id)
                    product.quantity_in_stock += item.quantity
                    product.save()
                except Product.DoesNotExist:
                    print(f"Warning: Product {item.product_id} not found for stock update")
        except Exception as e:
            print(f"Warning: Error updating stock for cancelled order: {e}")
        
        return Response({
            'message': 'Order cancelled successfully',
            'order': {
                'delivery_id': order.delivery_id,
                'status': order.status,
                'cancelled_at': timezone.now().isoformat()
            }
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'trace': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========== REFUND/RETURN MANAGEMENT ==========

@api_view(['POST'])
@permission_classes([AllowAny])
def create_refund_request(request):
    """Create a refund request for a delivered product within 30 days"""
    try:
        data = request.data
        order_id = data.get('order_id')  # delivery_id
        order_item_id = data.get('order_item_id')  # OrderItem id
        product_id = data.get('product_id')
        quantity = int(data.get('quantity', 1))
        reason = data.get('reason', '')
        customer_email = data.get('customer_email')
        
        if not order_id or not product_id or not customer_email:
            return Response(
                {'error': 'order_id, product_id, and customer_email are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not USE_DATABASE or not Order or not OrderItem:
            return Response(
                {'error': 'Database not available'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Get order
        try:
            order = Order.objects.get(delivery_id=order_id, customer_email=customer_email)
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if order is delivered
        if order.status != 'delivered':
            return Response(
                {'error': 'Only delivered orders can be refunded'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if delivery_date exists and is within 30 days
        if not order.delivery_date:
            return Response(
                {'error': 'Order delivery date is missing'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        days_since_delivery = (timezone.now().date() - order.delivery_date).days
        if days_since_delivery > 30:
            return Response(
                {'error': f'Refund request must be made within 30 days of delivery. {days_since_delivery} days have passed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get order item
        order_item = None
        if order_item_id:
            try:
                order_item = OrderItem.objects.get(id=order_item_id, order=order, product_id=product_id)
            except OrderItem.DoesNotExist:
                return Response(
                    {'error': 'Order item not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Find order item by product_id
            order_item = OrderItem.objects.filter(order=order, product_id=product_id).first()
            if not order_item:
                return Response(
                    {'error': 'Product not found in this order'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Check if quantity is valid
        if quantity > order_item.quantity:
            return Response(
                {'error': f'Requested quantity ({quantity}) exceeds ordered quantity ({order_item.quantity})'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if there's already a pending refund for this item
        from .models import RefundRequest
        existing_refund = RefundRequest.objects.filter(
            order=order,
            order_item=order_item,
            status='pending'
        ).exists()
        
        if existing_refund:
            return Response(
                {'error': 'A pending refund request already exists for this item'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate refund amount
        # IMPORTANT: order_item.price contains the price at time of purchase
        # If product was bought during a discount campaign, this price includes the discount
        # Even if the discount campaign ends, refund will use the purchase price (with discount)
        purchase_price = float(order_item.price)
        refund_amount = purchase_price * quantity
        
        # Create refund request
        refund_request = RefundRequest.objects.create(
            order=order,
            order_item=order_item,
            product_id=product_id,
            product_name=order_item.product_name,
            quantity=quantity,
            purchase_price=purchase_price,
            refund_amount=refund_amount,
            customer_id=order.customer_id,
            customer_name=order.customer_name,
            customer_email=customer_email,
            reason=reason,
            status='pending'
        )
        
        return Response({
            'message': 'Refund request created successfully',
            'refund_request': {
                'id': refund_request.id,
                'order_id': order.delivery_id,
                'product_name': refund_request.product_name,
                'quantity': refund_request.quantity,
                'refund_amount': float(refund_request.refund_amount),
                'status': refund_request.status,
                'requested_at': refund_request.requested_at.isoformat()
            }
        }, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'trace': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def refund_request_list(request):
    """Get list of refund requests (for sales manager or customer)"""
    try:
        status_filter = request.query_params.get('status')
        customer_email = request.query_params.get('customer_email')
        
        if not USE_DATABASE:
            return Response({'refund_requests': [], 'count': 0}, status=status.HTTP_200_OK)
        
        from .models import RefundRequest
        refund_requests_query = RefundRequest.objects.all().select_related('order', 'order_item')
        
        if status_filter:
            refund_requests_query = refund_requests_query.filter(status=status_filter)
        
        if customer_email:
            refund_requests_query = refund_requests_query.filter(customer_email=customer_email)
        
        refund_requests = []
        for rr in refund_requests_query:
            refund_requests.append({
                'id': rr.id,
                'order_id': rr.order.delivery_id,
                'order_item_id': rr.order_item.id if rr.order_item else None,
                'product_id': rr.product_id,
                'product_name': rr.product_name,
                'quantity': rr.quantity,
                'purchase_price': float(rr.purchase_price),
                'refund_amount': float(rr.refund_amount) if rr.refund_amount else None,
                'customer_id': rr.customer_id,
                'customer_name': rr.customer_name,
                'customer_email': rr.customer_email,
                'reason': rr.reason,
                'status': rr.status,
                'evaluated_by': rr.evaluated_by,
                'evaluation_notes': rr.evaluation_notes,
                'requested_at': rr.requested_at.isoformat(),
                'evaluated_at': rr.evaluated_at.isoformat() if rr.evaluated_at else None,
                'completed_at': rr.completed_at.isoformat() if rr.completed_at else None,
                'order_date': rr.order.order_date.strftime('%Y-%m-%d'),
                'delivery_date': rr.order.delivery_date.strftime('%Y-%m-%d') if rr.order.delivery_date else None,
            })
        
        return Response({
            'refund_requests': refund_requests,
            'count': len(refund_requests)
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'trace': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])  # TODO: Add IsAdminUser or custom permission
def approve_refund_request(request, refund_id):
    """Approve a refund request (Sales Manager)"""
    try:
        data = request.data
        action = data.get('action')  # 'approve' or 'reject'
        evaluation_notes = data.get('evaluation_notes', '')
        evaluated_by = data.get('evaluated_by', request.user.username if request.user.is_authenticated else 'System')
        
        if not USE_DATABASE:
            return Response(
                {'error': 'Database not available'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        from .models import RefundRequest
        try:
            refund_request = RefundRequest.objects.select_related('order', 'order_item').get(id=refund_id)
        except RefundRequest.DoesNotExist:
            return Response(
                {'error': 'Refund request not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if refund_request.status != 'pending':
            return Response(
                {'error': f'Refund request is already {refund_request.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if action == 'approve':
            with transaction.atomic():
                # Update refund request status
                refund_request.status = 'approved'
                refund_request.evaluated_by = evaluated_by
                refund_request.evaluation_notes = evaluation_notes
                refund_request.evaluated_at = timezone.now()
                refund_request.save()
                
                # Add product back to stock
                try:
                    product = Product.objects.select_for_update().get(id=refund_request.product_id)
                    product.quantity_in_stock += refund_request.quantity
                    product.save()
                except Product.DoesNotExist:
                    # Product might have been deleted, log but continue
                    print(f"Warning: Product {refund_request.product_id} not found for stock update")
                
                # Send email notification
                try:
                    from django.core.mail import send_mail
                    from django.conf import settings
                    
                    subject = f'Refund Approved - Order {refund_request.order.delivery_id}'
                    message = f'''Dear {refund_request.customer_name},

Your refund request for {refund_request.product_name} (Quantity: {refund_request.quantity}) has been approved.

Refund Amount: {refund_request.refund_amount} TL
Order ID: {refund_request.order.delivery_id}

The refund will be processed to your original payment method within 5-7 business days.

Thank you for your patience.

Best regards,
Pet Store Team'''
                    
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@petstore.com',
                        recipient_list=[refund_request.customer_email],
                        fail_silently=True
                    )
                except Exception as e:
                    print(f"Failed to send refund approval email: {e}")
        
        elif action == 'reject':
            refund_request.status = 'rejected'
            refund_request.evaluated_by = evaluated_by
            refund_request.evaluation_notes = evaluation_notes
            refund_request.evaluated_at = timezone.now()
            refund_request.save()
            
            # Send rejection email
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                
                subject = f'Refund Request Update - Order {refund_request.order.delivery_id}'
                message = f'''Dear {refund_request.customer_name},

Your refund request for {refund_request.product_name} has been reviewed.

Unfortunately, your refund request has been rejected.

Reason: {evaluation_notes if evaluation_notes else 'Please contact support for more information.'}

If you have any questions, please contact our support team.

Best regards,
Pet Store Team'''
                
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@petstore.com',
                    recipient_list=[refund_request.customer_email],
                    fail_silently=True
                )
            except Exception as e:
                print(f"Failed to send refund rejection email: {e}")
        
        else:
            return Response(
                {'error': 'Invalid action. Use "approve" or "reject"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'message': f'Refund request {action}ed successfully',
            'refund_request': {
                'id': refund_request.id,
                'status': refund_request.status,
                'evaluated_by': refund_request.evaluated_by,
                'evaluated_at': refund_request.evaluated_at.isoformat() if refund_request.evaluated_at else None
            }
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'trace': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_invoices(request):
    """Get invoices within a date range"""
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        if not start_date_str or not end_date_str:
            return Response(
                {'error': 'start_date and end_date query parameters are required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invoices = []
        
        if USE_DATABASE and Order:
            orders = Order.objects.filter(
                order_date__gte=start_date,
                order_date__lte=end_date
            ).prefetch_related('items').order_by('-order_date')
            
            for order in orders:
                invoices.append({
                    'delivery_id': order.delivery_id,
                    'customer_name': order.customer_name,
                    'customer_email': order.customer_email,
                    'order_date': order.order_date.strftime('%Y-%m-%d'),
                    'items': [{
                        'product_name': item.product_name,
                        'quantity': item.quantity,
                        'price': float(item.price)
                    } for item in order.items.all()],
                    'total_price': float(order.total_price),
                    'status': order.status
                })
        
        return Response({
            'invoices': invoices,
            'count': len(invoices),
            'start_date': start_date_str,
            'end_date': end_date_str
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'trace': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




@api_view(['GET'])
@permission_classes([AllowAny])
def get_revenue_profit(request):
    """Calculate revenue and profit/loss between given dates"""
    try:
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        if not start_date_str or not end_date_str:
            return Response(
                {'error': 'start_date and end_date query parameters are required (YYYY-MM-DD)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        total_revenue = 0
        total_cost = 0
        daily_data = []
        
        if USE_DATABASE and Order and OrderItem:
            from django.db.models import Sum, F
            from collections import defaultdict
            
            # Count all orders, not just delivered (for revenue calculation)
            orders = Order.objects.filter(
                order_date__gte=start_date,
                order_date__lte=end_date
            ).prefetch_related('items')
            
            # Group by date
            daily_revenue = defaultdict(float)
            daily_cost = defaultdict(float)
            
            for order in orders:
                order_date_str = order.order_date.strftime('%Y-%m-%d')
                
                for item in order.items.all():
                    revenue = float(item.price) * item.quantity
                    total_revenue += revenue
                    daily_revenue[order_date_str] += revenue
                    
                    # Get product cost (default to 50% of price if not set)
                    try:
                        product = Product.objects.get(id=item.product_id)
                        cost_per_unit = float(product.cost) if product.cost else float(item.price) * 0.5
                    except Product.DoesNotExist:
                        cost_per_unit = float(item.price) * 0.5
                    
                    cost = cost_per_unit * item.quantity
                    total_cost += cost
                    daily_cost[order_date_str] += cost
            
            # Create daily data for chart
            current_date = start_date
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                revenue = daily_revenue.get(date_str, 0)
                cost = daily_cost.get(date_str, 0)
                profit = revenue - cost
                
                daily_data.append({
                    'date': date_str,
                    'revenue': round(revenue, 2),
                    'cost': round(cost, 2),
                    'profit': round(profit, 2)
                })
                
                current_date += timedelta(days=1)
        
        total_profit = total_revenue - total_cost
        
        return Response({
            'start_date': start_date_str,
            'end_date': end_date_str,
            'total_revenue': round(total_revenue, 2),
            'total_cost': round(total_cost, 2),
            'total_profit': round(total_profit, 2),
            'daily_data': daily_data
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'trace': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




def generate_invoice_pdf(order):
    """Generate a PDF invoice with PatiHouse format - supports OrderItem model"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)

    # Header
    p.setFont("Helvetica-Bold", 20)
    p.drawString(50, 750, "PatiHouse")
    
    p.setFont("Helvetica-Bold", 14)
    p.drawString(450, 750, "INVOICE")

    # Order Info
    p.setFont("Helvetica", 10)
    p.drawString(50, 720, f"Invoice No: {order.delivery_id}")
    order_date = order.order_date.strftime('%Y-%m-%d') if hasattr(order.order_date, 'strftime') else str(order.order_date)
    p.drawString(50, 705, f"Date: {order_date}")

    # Customer Info
    p.setFont("Helvetica-Bold", 11)
    p.drawString(50, 660, "BILLED TO:")
    p.setFont("Helvetica", 10)
    p.drawString(50, 645, order.customer_name or 'Guest')
    p.drawString(50, 630, order.customer_email or '')
    if hasattr(order, 'delivery_address') and order.delivery_address:
        # Split address if it's too long
        addr_lines = order.delivery_address.split(',')[:2]
        for i, line in enumerate(addr_lines):
            p.drawString(50, 615 - (i * 15), line.strip())

    # Products Table Header
    y = 570 if hasattr(order, 'delivery_address') and order.delivery_address else 600
    p.setFont("Helvetica-Bold", 10)
    p.drawString(50, y, "Item")
    p.drawString(350, y, "Quantity")
    p.drawString(420, y, "Unit Price")
    p.drawString(500, y, "Total")
    
    # Draw line
    p.line(50, y - 5, 550, y - 5)
    
    # Products - Support both OrderItem model and legacy single product
    y -= 25
    p.setFont("Helvetica", 10)
    total = 0
    
    # Check if order has items (OrderItem model)
    if hasattr(order, 'items') and hasattr(order.items, 'all'):
        for item in order.items.all():
            item_total = float(item.price) * item.quantity
            total += item_total
            p.drawString(50, y, item.product_name)
            p.drawString(350, y, str(item.quantity))
            p.drawString(420, y, f"{float(item.price):.2f} TRY")
            p.drawString(500, y, f"{item_total:.2f} TRY")
            y -= 20
    # Legacy support for single product_name field
    elif hasattr(order, 'product_name') and hasattr(order, 'quantity'):
        item_total = float(order.total_price)
        total = item_total
        p.drawString(50, y, order.product_name)
        p.drawString(350, y, str(order.quantity))
        unit_price = float(order.total_price) / order.quantity if order.quantity > 0 else 0
        p.drawString(420, y, f"{unit_price:.2f} TRY")
        p.drawString(500, y, f"{item_total:.2f} TRY")
        y -= 20
    else:
        # Fallback: just show total
        total = float(order.total_price) if hasattr(order, 'total_price') else 0
        p.drawString(50, y, "Order Items")
        p.drawString(500, y, f"{total:.2f} TRY")
        y -= 20

    # Totals
    y -= 10
    p.line(50, y, 550, y)
    y -= 20
    
    subtotal = total / 1.18
    tax = total - subtotal
    
    p.setFont("Helvetica", 10)
    p.drawString(400, y, "Subtotal (excl. VAT):")
    p.drawString(500, y, f"{subtotal:.2f} TRY")
    y -= 15
    
    p.drawString(400, y, "Tax (18%):")
    p.drawString(500, y, f"{tax:.2f} TRY")
    y -= 20
    
    p.setFont("Helvetica-Bold", 12)
    p.drawString(400, y, "Total (incl. VAT):")
    p.drawString(500, y, f"{total:.2f} TRY")
    
    # Footer
    y = 100
    p.setFont("Helvetica", 10)
    p.drawString(50, y, "Thank you for shopping with PatiHouse!")

    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer


def send_invoice_email(order):
    """Send invoice PDF to the customer via email"""
    pdf_buffer = generate_invoice_pdf(order)

    email = EmailMessage(
        subject=f"Your PatiHouse Invoice - Order {order.delivery_id}",
        body="Thank you for your order! Your invoice is attached.",
        from_email="petstore.orders@example.com",  # proje için dummy hesap
        to=[order.customer_email],
    )

    email.attach(
        f"invoice_{order.delivery_id}.pdf",
        pdf_buffer.getvalue(),
        "application/pdf",
    )

    email.send()
