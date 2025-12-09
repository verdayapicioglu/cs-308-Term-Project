from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import Product, Order, Review
from django.http import HttpResponse, Http404

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
from django.core.mail import EmailMessage
import uuid

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

@api_view(['POST'])
@permission_classes([AllowAny])
def create_order(request):
    """
    Frontend checkout için yeni sipariş oluşturur
    ve daha sonra email ile invoice atılabilir.
    """
    data = request.data

    required_fields = [
        "customer_name",
        "customer_email",
        "product_name",
        "quantity",
        "total_price",
        "delivery_address",
    ]

    for field in required_fields:
        if field not in data:
            return Response(
                {"error": f"Missing field: {field}"},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Basit delivery & customer id üret
    delivery_id = f"DEL-{uuid.uuid4().hex[:6].upper()}"
    customer_id = data.get("customer_id") or f"CUST-{uuid.uuid4().hex[:6].upper()}"

    order = Order.objects.create(
        delivery_id=delivery_id,
        customer_id=customer_id,
        customer_name=data["customer_name"],
        customer_email=data["customer_email"],
        product_id=data.get("product_id"),
        product_name=data["product_name"],
        quantity=data["quantity"],
        total_price=data["total_price"],
        delivery_address=data["delivery_address"],
        status="processing",
        order_date=timezone.now().date(),
    )

    # Şimdilik email hatası olsa bile patlatma
    try:
        send_invoice_email(order)
    except Exception as e:
        print("Invoice email error:", e)

    return Response({
        "delivery_id": order.delivery_id,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "product_name": order.product_name,
        "quantity": order.quantity,
        "total_price": float(order.total_price),
        "delivery_address": order.delivery_address,
        "status": order.status,
    }, status=status.HTTP_201_CREATED)
@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """Return basic dashboard statistics for products and orders"""
    total_products = Product.objects.count()
    total_orders = Order.objects.count()

    delivered_orders = Order.objects.filter(status='delivered').count()
    processing_orders = Order.objects.filter(status='processing').count()
    in_transit_orders = Order.objects.filter(status='in-transit').count()

    data = {
        "total_products": total_products,
        "total_orders": total_orders,
        "delivered_orders": delivered_orders,
        "processing_orders": processing_orders,
        "in_transit_orders": in_transit_orders,
    }

    return Response(data, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([AllowAny])
def delivery_dashboard_stats(request):
    """Return delivery department dashboard statistics"""
    from django.db.models import Sum
    from datetime import timedelta
    
    # Total orders
    total_orders = Order.objects.count()
    
    # Orders by status
    processing_orders = Order.objects.filter(status='processing').count()
    in_transit_orders = Order.objects.filter(status='in-transit').count()
    delivered_orders = Order.objects.filter(status='delivered').count()
    
    # Today's orders
    today = timezone.now().date()
    today_orders = Order.objects.filter(order_date=today).count()
    
    # Pending deliveries (processing + in-transit)
    pending_deliveries = processing_orders + in_transit_orders
    
    # Total revenue from delivered orders
    delivered_revenue = Order.objects.filter(status='delivered').aggregate(
        total=Sum('total_price')
    )['total'] or 0
    
    # Average delivery time (for delivered orders with delivery_date)
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
    
    # Orders by date (last 7 days)
    seven_days_ago = today - timedelta(days=7)
    recent_orders = Order.objects.filter(order_date__gte=seven_days_ago).count()
    
    # Urgent orders (processing for more than 2 days)
    two_days_ago = today - timedelta(days=2)
    urgent_orders = Order.objects.filter(
        status='processing',
        order_date__lt=two_days_ago
    ).count()
    
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


@api_view(['POST'])
@permission_classes([AllowAny])
def create_order(request):
    """Create a new order (used by frontend checkout) and send invoice email"""
    data = request.data

    required_fields = [
        "customer_name",
        "customer_email",
        "product_name",
        "quantity",
        "total_price",
        "delivery_address",
    ]

    for field in required_fields:
        if field not in data:
            return Response({"error": f"Missing field: {field}"}, status=status.HTTP_400_BAD_REQUEST)

    delivery_id = f"DEL-{uuid.uuid4().hex[:6].upper()}"
    customer_id = data.get("customer_id") or f"CUST-{uuid.uuid4().hex[:6].upper()}"

    order = Order.objects.create(
        delivery_id=delivery_id,
        customer_id=customer_id,
        customer_name=data["customer_name"],
        customer_email=data["customer_email"],
        product_id=data.get("product_id"),
        product_name=data["product_name"],
        quantity=data["quantity"],
        total_price=data["total_price"],
        delivery_address=data["delivery_address"],
        status="processing",
        order_date=timezone.now().date(),
    )

    try:
        send_invoice_email(order)
    except Exception as e:
        # Hata olsa bile sipariş oluşsun, sadece logla
        print("Invoice email error:", e)

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
    }, status=status.HTTP_201_CREATED)


def generate_invoice_pdf(order):
    """Generate a simple PDF invoice for a single-order item"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)

    p.setFont("Helvetica-Bold", 18)
    p.drawString(50, 750, "Pet Store Invoice")

    p.setFont("Helvetica", 12)
    p.drawString(50, 720, f"Order ID: {order.delivery_id}")
    p.drawString(50, 700, f"Customer: {order.customer_name} ({order.customer_email})")
    p.drawString(50, 680, f"Date: {order.order_date.strftime('%Y-%m-%d')}")

    y = 640
    p.drawString(50, y, "Products:")
    y -= 20

    line = f"{order.product_name}  x{order.quantity}  = {order.total_price} TL"
    p.drawString(60, y, line)
    y -= 30

    p.drawString(50, y, f"Total: {order.total_price} TL")

    p.showPage()
    p.save()

    buffer.seek(0)
    return buffer


def send_invoice_email(order):
    """Send invoice PDF to the customer via email"""
    pdf_buffer = generate_invoice_pdf(order)

    email = EmailMessage(
        subject=f"Your Pet Store Invoice - Order {order.delivery_id}",
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


# Comment Approval
@api_view(['POST'])
@permission_classes([AllowAny])
def review_create(request):
    """Create a new review/comment"""
    try:
        review = Review.objects.create(
            product_id=request.data.get('product_id') or request.data.get('productId'),
            product_name=request.data.get('product_name') or request.data.get('productName', ''),
            user_id=str(request.data.get('user_id') or request.data.get('userId', '')),
            user_name=request.data.get('user_name') or request.data.get('userName', ''),
            user_email=request.data.get('user_email') or request.data.get('userEmail', ''),
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

