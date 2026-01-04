from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Conversation, Message, Attachment, SupportAgent
from .serializers import (
    ConversationSerializer, 
    ConversationListSerializer,
    MessageSerializer,
    AttachmentSerializer,
    CustomerDetailsSerializer
)
from api.models import Order as ApiOrder, OrderItem, Cart, CartItem, Wishlist, WishlistItem
from product_manager_api.models import Product, Order as PMOrder

channel_layer = get_channel_layer()


def is_support_agent(user):
    """Check if user is a support agent"""
    return user.is_staff or SupportAgent.objects.filter(user=user).exists()


@api_view(['POST'])
@permission_classes([AllowAny])
def create_conversation(request):
    """Create a new support conversation (customer or guest)"""
    try:
        guest_session_id = request.data.get('guest_session_id')
        
        # CRITICAL: If guest_session_id is explicitly provided, treat as guest user
        # This handles logout cases where session cookie might still be valid
        if guest_session_id:
            user = None  # Force guest conversation when guest_session_id is provided
        else:
            user = request.user if request.user.is_authenticated else None
        
        # Generate guest session ID if not provided and user is not authenticated
        if not user and not guest_session_id:
            guest_session_id = request.session.session_key or f"guest_{timezone.now().timestamp()}"
            if not request.session.session_key:
                request.session.create()
                guest_session_id = request.session.session_key

        conversation = Conversation.objects.create(
            customer=user,
            guest_session_id=guest_session_id if not user else None,
            status='waiting'
        )

        # Notify agents about new conversation
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'agents',
                {
                    'type': 'new_conversation',
                    'conversation_id': conversation.id,
                }
            )

        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_conversations(request):
    """List conversations - different views for agents vs customers"""
    try:
        if is_support_agent(request.user):
            # Agent view: all conversations
            status_filter = request.query_params.get('status', None)
            conversations = Conversation.objects.all()
            
            if status_filter:
                conversations = conversations.filter(status=status_filter)
            
            # Show waiting conversations first, then active, then closed
            conversations = conversations.order_by(
                '-status' if status_filter else 'status',
                '-created_at'
            )
        else:
            # Customer view: only their conversations
            conversations = Conversation.objects.filter(customer=request.user)
            conversations = conversations.order_by('-created_at')

        serializer = ConversationListSerializer(conversations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_conversation(request, conversation_id):
    """Get conversation details with messages"""
    try:
        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        # Check permissions
        if request.user.is_authenticated:
            if not is_support_agent(request.user) and conversation.customer != request.user:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        else:
            # Guest users can only access their own conversations
            if conversation.guest_session_id != request.session.session_key:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def claim_conversation(request, conversation_id):
    """Agent claims a conversation"""
    try:
        if not is_support_agent(request.user):
            return Response({'error': 'Only support agents can claim conversations'}, 
                          status=status.HTTP_403_FORBIDDEN)

        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        if conversation.status == 'closed':
            return Response({'error': 'Cannot claim a closed conversation'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        conversation.agent = request.user
        conversation.status = 'active'
        conversation.save()

        # Update agent's active conversation count
        agent_profile, _ = SupportAgent.objects.get_or_create(user=request.user)
        agent_profile.active_conversations_count = Conversation.objects.filter(
            agent=request.user, status='active'
        ).count()
        agent_profile.save()

        # Notify customer about agent joining
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'conversation_{conversation_id}',
                {
                    'type': 'agent_joined',
                    'agent_name': request.user.username,
                }
            )

        serializer = ConversationSerializer(conversation)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_customer_details(request, conversation_id):
    """Get customer details for agents (orders, cart, etc.)"""
    try:
        if not is_support_agent(request.user):
            return Response({'error': 'Only support agents can view customer details'}, 
                          status=status.HTTP_403_FORBIDDEN)

        conversation = get_object_or_404(Conversation, id=conversation_id)
        
        if not conversation.customer:
            return Response({
                'user_id': None,
                'username': 'Guest User',
                'email': None,
                'orders': [],
                'cart_items': [],
                'wishlist_items': [],
                'order_count': 0,
                'cart_item_count': 0,
                'wishlist_item_count': 0
            }, status=status.HTTP_200_OK)

        customer = conversation.customer

        # Get orders from both models
        orders_data = []
        
        # 1. Get orders from api.models.Order (user-based)
        api_orders = ApiOrder.objects.filter(user=customer).order_by('-created_at')[:10]
        for order in api_orders:
            items = order.items.all()
            orders_data.append({
                'id': order.id,
                'order_id': f'API-{order.id}',
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'delivery_address': order.delivery_address,
                'status': 'unknown',  # api.models.Order doesn't have status
                'items': [{
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': float(item.price)
                } for item in items]
            })
        
        # 2. Get orders from product_manager_api.models.Order (email-based, has status!)
        pm_orders = PMOrder.objects.filter(customer_email=customer.email).order_by('-order_date', '-created_at')[:10]
        for order in pm_orders:
            items = order.items.all()
            orders_data.append({
                'id': order.id,
                'order_id': order.delivery_id,
                'created_at': order.created_at.isoformat() if order.created_at else None,
                'order_date': order.order_date.isoformat() if order.order_date else None,
                'delivery_address': order.delivery_address,
                'status': order.status,  # ✅ Delivery status!
                'delivery_date': order.delivery_date.isoformat() if order.delivery_date else None,
                'items': [{
                    'product_id': item.product_id,
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'price': float(item.price)
                } for item in items]
            })
        
        # Sort by created_at/order_date (most recent first)
        orders_data.sort(key=lambda x: x.get('created_at') or x.get('order_date') or '', reverse=True)
        orders_data = orders_data[:10]  # Keep only top 10

        # Get cart items
        cart_items = []
        try:
            cart, created = Cart.objects.get_or_create(user=customer)
            cart_items_obj = cart.items.all()
            cart_items = [{
                'product_id': item.product_id,
                'product_name': item.product_name,
                'quantity': item.quantity,
                'price': float(item.price),
                'image_url': item.image_url
            } for item in cart_items_obj]
        except Exception as e:
            pass

        # Get wishlist items
        wishlist_items = []
        try:
            wishlist = Wishlist.objects.get(user=customer)
            wishlist_items_obj = wishlist.items.all()
            wishlist_items = [{
                'product_id': item.product_id,
                'product_name': item.product_name,
                'price': float(item.price),
                'image_url': item.image_url,
                'created_at': item.created_at.isoformat() if item.created_at else None
            } for item in wishlist_items_obj]
        except Wishlist.DoesNotExist:
            pass

        # Calculate total cart quantity (sum of all item quantities)
        total_cart_quantity = sum(item['quantity'] for item in cart_items)
        
        data = {
            'user_id': customer.id,
            'username': customer.username,
            'email': customer.email,
            'orders': orders_data,
            'cart_items': cart_items,
            'wishlist_items': wishlist_items,
            'order_count': ApiOrder.objects.filter(user=customer).count() + PMOrder.objects.filter(customer_email=customer.email).count(),
            'cart_item_count': total_cart_quantity,  # Total quantity, not unique item count
            'wishlist_item_count': len(wishlist_items)
        }

        serializer = CustomerDetailsSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def upload_file(request):
    """Upload file attachment"""
    try:
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        # For multipart/form-data, data comes in request.POST, not request.data
        conversation_id = request.POST.get('conversation_id') or (request.data.get('conversation_id') if hasattr(request, 'data') else None)
        message_id = request.POST.get('message_id') or (request.data.get('message_id') if hasattr(request, 'data') else None)
        
        # Convert to int if it's a string
        if conversation_id:
            try:
                conversation_id = int(conversation_id)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid conversation_id'}, status=status.HTTP_400_BAD_REQUEST)

        if not conversation_id:
            return Response({'error': 'conversation_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        conversation = get_object_or_404(Conversation, id=conversation_id)

        # Check permissions
        if request.user.is_authenticated:
            if not is_support_agent(request.user) and conversation.customer != request.user:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        else:
            if conversation.guest_session_id != request.session.session_key:
                return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        # Determine file type
        file_extension = file.name.split('.')[-1].lower()
        if file_extension in ['pdf']:
            file_type = 'pdf'
        elif file_extension in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
            file_type = 'image'
        elif file_extension in ['mp4', 'avi', 'mov', 'webm']:
            file_type = 'video'
        else:
            file_type = 'other'

        # Create or get message
        if message_id:
            message = get_object_or_404(Message, id=message_id, conversation=conversation)
        else:
            # Create new message for file
            # CRITICAL: Check if user is the assigned agent for this conversation
            # If user is the assigned agent, they are sending as agent
            # Otherwise, they are sending as customer (even if they are staff)
            is_from_agent = False
            if request.user.is_authenticated and conversation.agent:
                if conversation.agent.id == request.user.id:
                    is_from_agent = True
            
            message = Message.objects.create(
                conversation=conversation,
                sender=request.user if request.user.is_authenticated else None,
                is_from_agent=is_from_agent,
                message_type='file',
                content=file.name
            )

        # Create attachment
        attachment = Attachment.objects.create(
            message=message,
            file=file,
            file_type=file_type,
            file_name=file.name,
            file_size=file.size
        )

        # Serialize message with attachments
        message_data = MessageSerializer(message, context={'request': request}).data
        
        # Notify via WebSocket
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'conversation_{conversation_id}',
                {
                    'type': 'new_message',
                    'message': message_data
                }
            )

        serializer = AttachmentSerializer(attachment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    except Exception as e:
        import traceback
        print(f"File upload error: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
