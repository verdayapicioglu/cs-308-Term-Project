from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import Product, Order, Review

MOCK_CATEGORIES = ["Food", "Accessories", "Housing", "Toys", "Health"]
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def product_list_create(request):
    if request.method == 'GET':
        products = Product.objects.all()
        products_data = [{
            'id': p.id,
            'name': p.name,
            'model': p.model,
            'serial_number': p.serial_number,
            'description': p.description,
            'quantity_in_stock': p.quantity_in_stock,
            'price': float(p.price),
            'warranty_status': p.warranty_status,
            'distributor': p.distributor,
            'category': p.category,
            'cost': float(p.cost) if p.cost else None,
        } for p in products]
        
        return Response({
            'products': products_data,
            'count': products.count()
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'POST':
        try:
            product = Product.objects.create(
                name=request.data.get('name'),
                model=request.data.get('model'),
                serial_number=request.data.get('serial_number'),
                description=request.data.get('description'),
                quantity_in_stock=request.data.get('quantity_in_stock', 0),
                price=request.data.get('price'),
                warranty_status=request.data.get('warranty_status', ''),
                distributor=request.data.get('distributor', ''),
                category=request.data.get('category'),
                cost=request.data.get('cost'),
            )
            
            return Response({
                'id': product.id,
                'name': product.name,
                'model': product.model,
                'serial_number': product.serial_number,
                'description': product.description,
                'quantity_in_stock': product.quantity_in_stock,
                'price': float(product.price),
                'warranty_status': product.warranty_status,
                'distributor': product.distributor,
                'category': product.category,
                'cost': float(product.cost) if product.cost else None,
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': f'Error creating product: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def product_detail(request, product_id):
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        return Response({
            'id': product.id,
            'name': product.name,
            'model': product.model,
            'serial_number': product.serial_number,
            'description': product.description,
            'quantity_in_stock': product.quantity_in_stock,
            'price': float(product.price),
            'warranty_status': product.warranty_status,
            'distributor': product.distributor,
            'category': product.category,
            'cost': float(product.cost) if product.cost else None,
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'PUT':
        product.name = request.data.get('name', product.name)
        product.model = request.data.get('model', product.model)
        product.serial_number = request.data.get('serial_number', product.serial_number)
        product.description = request.data.get('description', product.description)
        product.quantity_in_stock = request.data.get('quantity_in_stock', product.quantity_in_stock)
        product.price = request.data.get('price', product.price)
        product.warranty_status = request.data.get('warranty_status', product.warranty_status)
        product.distributor = request.data.get('distributor', product.distributor)
        product.category = request.data.get('category', product.category)
        product.cost = request.data.get('cost', product.cost)
        product.save()
        
        return Response({
            'id': product.id,
            'name': product.name,
            'model': product.model,
            'serial_number': product.serial_number,
            'description': product.description,
            'quantity_in_stock': product.quantity_in_stock,
            'price': float(product.price),
            'warranty_status': product.warranty_status,
            'distributor': product.distributor,
            'category': product.category,
            'cost': float(product.cost) if product.cost else None,
        }, status=status.HTTP_200_OK)
    
    elif request.method == 'DELETE':
        product.delete()
        return Response(
            {'message': 'Product deleted successfully'},
            status=status.HTTP_200_OK
        )

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def category_list_create(request):
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

@api_view(['GET'])
@permission_classes([AllowAny])
def stock_list(request):
    products = Product.objects.all()
    stock_data = [{
        'product_id': p.id,
        'product_name': p.name,
        'quantity_in_stock': p.quantity_in_stock,
        'low_stock': p.quantity_in_stock < 20 and p.quantity_in_stock > 0,
        'out_of_stock': p.quantity_in_stock == 0
    } for p in products]
    return Response({'stock': stock_data}, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([AllowAny])
def stock_update(request, product_id):
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    new_quantity = request.data.get('quantity_in_stock')
    if new_quantity is not None:
        product.quantity_in_stock = int(new_quantity)
        product.save()
        return Response({
            'id': product.id,
            'name': product.name,
            'quantity_in_stock': product.quantity_in_stock,
        }, status=status.HTTP_200_OK)
    
    return Response(
        {'error': 'Invalid quantity'},
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(['GET'])
@permission_classes([AllowAny])
def order_list(request):
    status_filter = request.query_params.get('status')
    
    orders_query = Order.objects.all()
    if status_filter:
        orders_query = orders_query.filter(status=status_filter)
    
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
    } for o in orders_query]
    
    return Response({
        'orders': orders_data,
        'count': len(orders_data)
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def order_detail(request, delivery_id):
    try:
        order = Order.objects.get(delivery_id=delivery_id)
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response({
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
        'order_date': order.order_date.strftime('%Y-%m-%d'),
        'delivery_date': order.delivery_date.strftime('%Y-%m-%d') if order.delivery_date else None,
    }, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([AllowAny])
def order_update_status(request, delivery_id):
    try:
        order = Order.objects.get(delivery_id=delivery_id)
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    new_status = request.data.get('status')
    valid_statuses = ['processing', 'in-transit', 'delivered']
    
    if new_status in valid_statuses:
        order.status = new_status
        if new_status == 'delivered' and not order.delivery_date:
            order.delivery_date = timezone.now().date()
        order.save()
        
        return Response({
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
            'order_date': order.order_date.strftime('%Y-%m-%d'),
            'delivery_date': order.delivery_date.strftime('%Y-%m-%d') if order.delivery_date else None,
        }, status=status.HTTP_200_OK)
    
    return Response(
        {'error': f'Invalid status. Must be one of: {valid_statuses}'},
        status=status.HTTP_400_BAD_REQUEST
    )

# Comment Approval
@api_view(['GET'])
@permission_classes([AllowAny])
def comment_list(request):
    """Get all comments (pending and approved)"""
    status_filter = request.query_params.get('status')
    
    reviews_query = Review.objects.all()
    if status_filter:
        reviews_query = reviews_query.filter(status=status_filter)
    
    comments = [{
        'id': r.id,
        'product_id': r.product_id,
        'product_name': r.product_name,
        'productName': r.product_name,  # Alternative field name for frontend compatibility
        'user_id': r.user_id,
        'user_name': r.user_name,
        'userName': r.user_name,  # Alternative field name for frontend compatibility
        'user_email': r.user_email,
        'userEmail': r.user_email,  # Alternative field name for frontend compatibility
        'rating': r.rating,
        'comment': r.comment,
        'status': r.status,
        'date': r.created_at.isoformat(),
        'created_at': r.created_at.isoformat(),
    } for r in reviews_query]
    
    # Get pending count
    pending_count = Review.objects.filter(status='pending').count()
    
    return Response({
        'comments': comments,
        'count': len(comments),
        'pending_count': pending_count
    }, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([AllowAny])
def comment_approve(request, comment_id):
    """Approve or reject a comment"""
    try:
        review = Review.objects.get(id=comment_id)
    except Review.DoesNotExist:
        return Response(
            {'error': 'Comment not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    action = request.data.get('action')  # 'approve' or 'reject'
    
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

# Dashboard Stats
@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """Get dashboard statistics"""
    products = Product.objects.all()
    orders = Order.objects.all()
    
    return Response({
        'total_products': products.count(),
        'low_stock_products': products.filter(quantity_in_stock__lt=20, quantity_in_stock__gt=0).count(),
        'out_of_stock_products': products.filter(quantity_in_stock=0).count(),
        'total_orders': orders.count(),
        'processing_orders': orders.filter(status='processing').count(),
        'in_transit_orders': orders.filter(status='in-transit').count(),
        'delivered_orders': orders.filter(status='delivered').count(),
        'pending_comments': Review.objects.filter(status='pending').count(),
        'total_categories': products.values('category').distinct().count()
    }, status=status.HTTP_200_OK)






