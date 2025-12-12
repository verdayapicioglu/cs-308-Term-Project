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
from .models import Product # Import Product model

# Import Review and Order models
try:
    from .models import Review, Order
    USE_DATABASE = True
except ImportError:
    USE_DATABASE = False
    Review = None
    Order = None

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
        # Get sort parameter
        sort_option = request.query_params.get('sort', '').strip().lower()
        
        # Start with all products
        products_queryset = Product.objects.all()
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
                "category": p.category,
                "cost": float(p.cost) if p.cost else None,
                "image_url": p.image_url if p.image_url else "https://via.placeholder.com/300x300?text=Product",
                "average_rating": float(avg_rating),
                "rating_count": rating_count
            })

        # Apply sorting
        if sort_option == 'price':
            # Sort by price ascending, then by name
            products.sort(key=lambda p: (float(p.get('price', 0)), p.get('name', '').lower()))
        elif sort_option == 'popularity':
            # Sort by average_rating descending, then by name
            products.sort(key=lambda p: (float(p.get('average_rating', 0) or 0), p.get('name', '').lower()), reverse=True)
        
        return Response({
            'products': products,
            'count': len(products)
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        # Create new product
        try:
            p = Product.objects.create(
                name=request.data.get('name'),
                model=request.data.get('model', ''),
                serial_number=request.data.get('serial_number', ''),
                description=request.data.get('description', ''),
                quantity_in_stock=int(request.data.get('quantity_in_stock', 0)),
                price=float(request.data.get('price', 0)),
                warranty_status=request.data.get('warranty_status', ''),
                distributor=request.data.get('distributor', ''),
                category=request.data.get('category', ''),
                cost=float(request.data.get('cost')) if request.data.get('cost') else None,
                image_url=request.data.get('image_url', '')
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
                "category": p.category,
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
            "category": product.category,
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
        return Response({
            'categories': MOCK_CATEGORIES,
            'count': len(MOCK_CATEGORIES)
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        category = request.data.get('name')
        if category and category not in MOCK_CATEGORIES:
            MOCK_CATEGORIES.append(category)
            return Response(
                {'message': 'Category created', 'category': category},
                status=status.HTTP_201_CREATED
            )
        return Response(
            {'error': 'Category already exists or invalid name'},
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(['DELETE'])
@permission_classes([AllowAny])
def category_delete(request, category_name):
    """Delete a category"""
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
            'low_stock': p.quantity_in_stock < 20,
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
        orders_query = Order.objects.all().order_by('-order_date', '-created_at')
        if status_filter:
            orders_query = orders_query.filter(status=status_filter)
        if email_filter:
            orders_query = orders_query.filter(customer_email=email_filter)
        if product_filter:
            orders_query = orders_query.filter(product_id=product_filter)
            
        orders_data = [{
            'delivery_id': o.delivery_id,
            'customer_id': o.customer_id,
            'customer_name': o.customer_name,
            'customer_email': o.customer_email,
            'product_id': o.product_id,
            'product_name': o.product_name,
            'quantity': o.quantity,
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
    
    try:
        from .models import Order
        USE_ORDER_DB = True
    except ImportError:
        USE_ORDER_DB = False
        Order = None
    
    if USE_ORDER_DB and Order:
        # Use database
        orders_query = Order.objects.filter(customer_email=email).order_by('-order_date', '-created_at')
        
        orders_data = [{
            'delivery_id': o.delivery_id,
            'customer_id': o.customer_id,
            'customer_name': o.customer_name,
            'customer_email': o.customer_email,
            'product_id': o.product_id,
            'product_name': o.product_name,
            'quantity': o.quantity,
            'total_price': float(o.total_price),
            'delivery_address': o.delivery_address,
            'status': o.status,
            'order_date': o.order_date.strftime('%Y-%m-%d'),
            'delivery_date': o.delivery_date.strftime('%Y-%m-%d') if o.delivery_date else None,
            'created_at': o.created_at.isoformat() if hasattr(o, 'created_at') else None,
        } for o in orders_query]
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
            
            order.save()
            
            return Response({
                "delivery_id": order.delivery_id,
                "customer_id": order.customer_id,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "product_id": order.product_id,
                "product_name": order.product_name,
                "quantity": order.quantity,
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
            product_id=product_id,
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
    return Response({
        'total_products': len(MOCK_PRODUCTS),
        'low_stock_products': len([p for p in MOCK_PRODUCTS if p['quantity_in_stock'] < 20 and p['quantity_in_stock'] > 0]),
        'out_of_stock_products': len([p for p in MOCK_PRODUCTS if p['quantity_in_stock'] == 0]),
        'total_orders': len(MOCK_ORDERS),
        'processing_orders': len([o for o in MOCK_ORDERS if o['status'] == 'processing']),
        'in_transit_orders': len([o for o in MOCK_ORDERS if o['status'] == 'in-transit']),
        'delivered_orders': len([o for o in MOCK_ORDERS if o['status'] == 'delivered']),
        'pending_comments': Review.objects.filter(status='pending').count() if (USE_DATABASE and Review) else len([c for c in MOCK_COMMENTS if c['status'] == 'pending']),
        'total_categories': len(MOCK_CATEGORIES)
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
from api.views import send_invoice_email
from datetime import datetime, date
import uuid

@api_view(['POST'])
@permission_classes([AllowAny])
def create_order(request):
    """Create a new order from checkout"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        data = request.data
        
        required_fields = ["customer_name", "customer_email", "product_name", 
                           "quantity", "total_price", "delivery_address"]

        # missing field check
        for field in required_fields:
            if field not in data:
                return Response(
                    {"error": f"Missing field: {field}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Create delivery/order id
        delivery_id = f"DEL-{uuid.uuid4().hex[:6].upper()}"
        customer_id = f"CUST-{uuid.uuid4().hex[:6].upper()}"
        order_date = date.today()

        # Try to save to database first
        if USE_DATABASE and Order:
            # 1. Update Product Stock FIRST
            product_id = data.get("product_id")
            quantity_ordered = int(data.get("quantity", 1))
            
            # If product_id is provided, use it. If not, try to find by name (fallback)
            product_obj = None
            if product_id:
                try:
                    product_obj = Product.objects.get(id=product_id)
                except Product.DoesNotExist:
                    print(f"Product with id {product_id} not found.")
            
            # Decrease stock if product found
            if product_obj:
                if product_obj.quantity_in_stock >= quantity_ordered:
                    product_obj.quantity_in_stock -= quantity_ordered
                    product_obj.save()
                else:
                    return Response(
                        {"error": f"Insufficient stock for {product_obj.name}. Available: {product_obj.quantity_in_stock}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # 2. Create Order
            order = Order.objects.create(
                delivery_id=delivery_id,
                customer_id=customer_id,
                customer_name=data["customer_name"],
                customer_email=data["customer_email"],
                product_id=data.get("product_id", 0),
                product_name=data["product_name"],
                quantity=data["quantity"],
                total_price=data["total_price"],
                delivery_address=data["delivery_address"],
                status="processing",
                order_date=order_date,
                delivery_date=None
            )
            
            # Convert to dict for response
            new_order = {
                "delivery_id": order.delivery_id,
                "customer_id": order.customer_id,
                "customer_name": order.customer_name,
                "customer_email": order.customer_email,
                "product_id": order.product_id,
                "product_name": order.product_name,
                "quantity": order.quantity,
                "total_price": float(order.total_price),
                "delivery_address": order.delivery_address,
                "status": order.status,
                "order_date": order.order_date.strftime("%Y-%m-%d") if order.order_date else None,
                "delivery_date": order.delivery_date.strftime("%Y-%m-%d") if order.delivery_date else None,
            }
            
            # Email sending removed due to model incompatibility
            
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
            "product_id": data.get("product_id", None),
            "product_name": data["product_name"],
            "quantity": data["quantity"],
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
        return Response({"error": str(e), "trace": traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            orders = Order.objects.filter(customer_email=user_email).order_by('-order_date', '-created_at')
            orders_data = [{
                'delivery_id': order.delivery_id,
                'customer_id': order.customer_id,
                'customer_name': order.customer_name,
                'customer_email': order.customer_email,
                'product_id': order.product_id,
                'product_name': order.product_name,
                'quantity': order.quantity,
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
