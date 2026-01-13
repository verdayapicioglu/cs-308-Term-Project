from django.core.mail import EmailMessage, send_mail
from django.contrib.auth.models import User
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.template.loader import render_to_string
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Order, OrderItem, UserProfile, Cart, CartItem, Wishlist, WishlistItem
from product_manager_api.models import Product
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    UserSerializer,
    CartItemSerializer,
    WishlistItemSerializer
)


# ==================== INVOICE FUNCTIONS ====================
# Import invoice generation from product_manager_api to use consistent format
try:
    from product_manager_api.views import generate_invoice_pdf
except ImportError:
    # Fallback if import fails
    from backend.product_manager_api.views import generate_invoice_pdf


def send_invoice_email(order):
    """Sipariş oluşturulduğunda müşteriye PDF faturayı email ile gönderen fonksiyon."""
    pdf_buffer = generate_invoice_pdf(order)

    # Get delivery_id or id for order reference
    order_ref = getattr(order, 'delivery_id', None) or getattr(order, 'id', 'N/A')
    customer_email = getattr(order, 'customer_email', None) or (order.user.email if hasattr(order, 'user') and order.user else None)

    email = EmailMessage(
        subject=f"Your PatiHouse Invoice - Order {order_ref}",
        body="Thank you for your order! Your invoice is attached.",
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'petstore.orders@gmail.com'),
        to=[customer_email] if customer_email else [],
    )

    # PDF ekle
    email.attach(
        filename=f"invoice_{order_ref}.pdf",
        content=pdf_buffer.getvalue(),
        mimetype="application/pdf"
    )

    # Email gönder
    email.send()


# ==================== AUTHENTICATION VIEWS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """User registration endpoint"""
    try:
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Create UserProfile for new user (with empty fields)
            UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'phone': '',
                    'bio': '',
                    'loyalty_tier': 'Standard',
                    'loyalty_points': 0,
                    'pets_supported': 0,
                }
            )
            # Create Wishlist for new user
            Wishlist.objects.get_or_create(user=user)
            return Response({
                'message': 'User registered successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        # Return detailed validation errors
        return Response({
            'error': 'Validation failed',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': 'Registration failed',
            'detail': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """User login endpoint - accepts username or email"""
    try:
        username_or_email = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        
        if not username_or_email or not password:
            return Response({
                'error': 'Must include "username" and "password".'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to authenticate - first try as username, then as email
        user = None
        if '@' in username_or_email:
            # Looks like an email, try to find user by email
            try:
                user_obj = User.objects.get(email__iexact=username_or_email)
                user = authenticate(request=request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
            except User.MultipleObjectsReturned:
                # If multiple users with same email, get the first one
                user_obj = User.objects.filter(email__iexact=username_or_email).first()
                if user_obj:
                    user = authenticate(request=request, username=user_obj.username, password=password)
        else:
            # Try as username
            user = authenticate(request=request, username=username_or_email, password=password)
        
        if user and user.is_active:
            login(request, user)
            try:
                user_data = UserSerializer(user).data
            except Exception as ser_error:
                # If serialization fails, return basic user info
                user_data = {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            return Response({
                'message': 'Login successful',
                'user': user_data
            }, status=status.HTTP_200_OK)
        
        # Return 400 instead of 401 for invalid credentials
        return Response({
            'error': 'Unable to log in with provided credentials.',
            'detail': 'Please check your username/email and password.'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Login error: {str(e)}")
        print(f"Traceback: {error_trace}")
        return Response({
            'error': 'Login failed',
            'detail': str(e),
            'traceback': error_trace if settings.DEBUG else None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """User logout endpoint"""
    logout(request)
    return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user(request):
    """Get current user profile"""
    # Ensure user has a profile
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    """Update user profile information"""
    try:
        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        # Update profile fields
        if 'phone' in request.data:
            profile.phone = request.data.get('phone', '')
        if 'bio' in request.data:
            profile.bio = request.data.get('bio', '')
        if 'loyalty_tier' in request.data:
            profile.loyalty_tier = request.data.get('loyalty_tier', '')
        if 'loyalty_points' in request.data:
            profile.loyalty_points = request.data.get('loyalty_points', 0)
        if 'pets_supported' in request.data:
            profile.pets_supported = request.data.get('pets_supported', 0)
        
        profile.save()
        
        # Update user basic info if provided
        if 'first_name' in request.data:
            request.user.first_name = request.data.get('first_name', '')
        if 'last_name' in request.data:
            request.user.last_name = request.data.get('last_name', '')
        if 'email' in request.data:
            request.user.email = request.data.get('email', '')
        request.user.save()
        
        serializer = UserSerializer(request.user)
        return Response({
            'message': 'Profile updated successfully',
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Failed to update profile',
            'detail': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Request password reset - sends email with reset link"""
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            # Generate token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # In production, you'd send an email here
            # For now, we'll return the reset link in the response (for development)
            reset_link = f"{request.scheme}://{request.get_host()}/api/password-reset-confirm/?uid={uid}&token={token}"
            
            # TODO: Uncomment when email is configured
            # send_mail(
            #     subject='Password Reset Request - Pet Store',
            #     message=f'Click the link to reset your password: {reset_link}',
            #     from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@petstore.com'),
            #     recipient_list=[email],
            #     fail_silently=False,
            # )
            
            return Response({
                'message': 'Password reset link has been sent to your email.',
                # Remove this in production - only for development
                'reset_link': reset_link if settings.DEBUG else None
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            # Don't reveal if email exists or not
            return Response({
                'message': 'If that email exists, a password reset link has been sent.'
            }, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Confirm password reset with token"""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        uid = serializer.validated_data['uid']
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
            
            # Verify token
            if default_token_generator.check_token(user, token):
                user.set_password(new_password)
                user.save()
                return Response({
                    'message': 'Password has been reset successfully.'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Invalid or expired reset token.'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({
                'error': 'Invalid reset link.'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==================== ORDER VIEWS ====================

@api_view(['POST'])
@permission_classes([AllowAny])
def create_order(request):
    """
    Create a new order, save items, generate invoice PDF
    and send email to the user.
    """
    try:
        user = request.user if request.user.is_authenticated else None
        
        data = request.data
        items = data.get("items", [])
        delivery_address = data.get("delivery_address", "")

        if not items:
            return Response({"error": "No items in order"}, status=400)

        # Create Order
        order = Order.objects.create(
            user=user,
            delivery_address=delivery_address
        )

        # Create Order Items
        for item in items:
            OrderItem.objects.create(
                order=order,
                product_name=item["product_name"],
                quantity=item["quantity"],
                price=item["price"],
            )

        # Send invoice email
        send_invoice_email(order)

        return Response({
            "message": "Order created successfully",
            "order_id": order.id
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ==================== CART VIEWS ====================

def get_or_create_cart(user):
    """Helper function to get or create a cart for a user"""
    cart, created = Cart.objects.get_or_create(user=user)
    return cart


def get_or_create_wishlist(user):
    """Helper function to get or create a wishlist for a user"""
    wishlist, created = Wishlist.objects.get_or_create(user=user)
    return wishlist


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cart(request):
    """Get user's cart items"""
    try:
        cart = get_or_create_cart(request.user)
        items = cart.items.all()
        serializer = CartItemSerializer(items, many=True)
        return Response({
            'items': serializer.data,
            'count': items.count()
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Failed to fetch cart',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    """Add item to cart or update quantity if exists"""
    try:
        cart = get_or_create_cart(request.user)
        product_id = request.data.get('product_id')
        product_name = request.data.get('product_name', '')
        price = request.data.get('price', 0)
        quantity = request.data.get('quantity', 1)
        image_url = request.data.get('image_url', '')
        description = request.data.get('description', '')

        if not product_id:
            return Response({
                'error': 'product_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if item already exists in cart
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product_id=product_id,
            defaults={
                'product_name': product_name,
                'price': price,
                'quantity': quantity,
                'image_url': image_url,
                'description': description,
            }
        )

        # Verify stock
        try:
            product = Product.objects.get(id=product_id)
            current_cart_quantity = 0
            if not created:
                current_cart_quantity = cart_item.quantity
            
            total_requested = current_cart_quantity + quantity
            if total_requested > product.quantity_in_stock:
                 return Response({
                    'error': f'Insufficient stock. Only {product.quantity_in_stock} items available.',
                    'available_stock': product.quantity_in_stock
                }, status=status.HTTP_400_BAD_REQUEST)
        except Product.DoesNotExist:
             return Response({
                'error': 'Product not found during stock check'
            }, status=status.HTTP_404_NOT_FOUND)

        if not created:
            # Update quantity if item already exists
            cart_item.quantity += quantity
            cart_item.save()

        serializer = CartItemSerializer(cart_item)
        return Response({
            'message': 'Item added to cart',
            'item': serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'error': 'Failed to add item to cart',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_cart_item(request, item_id):
    """Update cart item quantity"""
    try:
        cart = get_or_create_cart(request.user)
        cart_item = CartItem.objects.get(id=item_id, cart=cart)
        
        new_quantity = request.data.get('quantity')
        if new_quantity is None:
            return Response({
                'error': 'quantity is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        if new_quantity <= 0:
            cart_item.delete()
            return Response({
                'message': 'Item removed from cart'
            }, status=status.HTTP_200_OK)

        # Verify stock
        try:
            product = Product.objects.get(id=cart_item.product_id)
            if new_quantity > product.quantity_in_stock:
                return Response({
                    'error': f'Insufficient stock. Only {product.quantity_in_stock} items available.',
                    'available_stock': product.quantity_in_stock
                }, status=status.HTTP_400_BAD_REQUEST)
        except Product.DoesNotExist:
            # If product is gone, maybe we should remove from cart? For now just fail.
             return Response({
                'error': 'Product no longer exists'
            }, status=status.HTTP_404_NOT_FOUND)

        cart_item.quantity = new_quantity
        cart_item.save()

        serializer = CartItemSerializer(cart_item)
        return Response({
            'message': 'Cart item updated',
            'item': serializer.data
        }, status=status.HTTP_200_OK)

    except CartItem.DoesNotExist:
        return Response({
            'error': 'Cart item not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to update cart item',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request, item_id):
    """Remove item from cart"""
    try:
        cart = get_or_create_cart(request.user)
        cart_item = CartItem.objects.get(id=item_id, cart=cart)
        cart_item.delete()
        return Response({
            'message': 'Item removed from cart'
        }, status=status.HTTP_200_OK)

    except CartItem.DoesNotExist:
        return Response({
            'error': 'Cart item not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to remove item from cart',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_cart(request):
    """Clear all items from cart"""
    try:
        cart = get_or_create_cart(request.user)
        cart.items.all().delete()
        return Response({
            'message': 'Cart cleared'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'error': 'Failed to clear cart',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def merge_cart(request):
    """Merge local cart items with user's account cart"""
    try:
        cart = get_or_create_cart(request.user)
        local_items = request.data.get('items', [])

        if not local_items:
            # Just return current cart if no local items
            items = cart.items.all()
            serializer = CartItemSerializer(items, many=True)
            return Response({
                'items': serializer.data,
                'count': items.count()
            }, status=status.HTTP_200_OK)

        merged_count = 0
        for local_item in local_items:
            product_id = local_item.get('id') or local_item.get('product_id')
            if not product_id:
                continue

            product_name = local_item.get('name') or local_item.get('product_name', '')
            price = local_item.get('price', 0)
            quantity = local_item.get('quantity', 1)
            image_url = local_item.get('image_url', '')
            description = local_item.get('description', '')

            # Check if item already exists in cart
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product_id=product_id,
                defaults={
                    'product_name': product_name,
                    'price': price,
                    'quantity': quantity,
                    'image_url': image_url,
                    'description': description,
                }
            )

            # Verify stock for merge
            try:
                product_obj = Product.objects.get(id=product_id)
                current_qty = 0
                if not created:
                    current_qty = cart_item.quantity
                
                # If merging exceeds stock, cap it at max available? Or fail?
                # Let's cap it at max available for better UX, or just don't add more.
                # Here we will try to add, if fail, we just set to max stock.
                
                final_qty = current_qty + quantity
                if final_qty > product_obj.quantity_in_stock:
                    final_qty = product_obj.quantity_in_stock
                
                if not created:
                    cart_item.quantity = final_qty
                    cart_item.save()
                else:
                    # If it was just created with quantity, we need to check if that initial quantity was too high
                    if cart_item.quantity > product_obj.quantity_in_stock:
                        cart_item.quantity = product_obj.quantity_in_stock
                        cart_item.save()

            except Product.DoesNotExist:
                continue # Skip if product missing

            if not created and not Product.objects.filter(id=product_id).exists():
                 # Should not happen due to try/except but logic wise
                 pass

            merged_count += 1

        # Return merged cart
        items = cart.items.all()
        serializer = CartItemSerializer(items, many=True)
        return Response({
            'message': f'Cart merged successfully. {merged_count} items processed.',
            'items': serializer.data,
            'count': items.count()
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'error': 'Failed to merge cart',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)   


# Wishlist endpoints
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wishlist(request):
    """Get user's wishlist items"""
    try:
        wishlist = get_or_create_wishlist(request.user)
        items = wishlist.items.all()
        serializer = WishlistItemSerializer(items, many=True)
        return Response({
            'items': serializer.data,
            'count': items.count()
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Failed to fetch wishlist',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_wishlist(request):
    """Add item to wishlist"""
    try:
        wishlist = get_or_create_wishlist(request.user)
        product_id = request.data.get('product_id')
        product_name = request.data.get('product_name', '')
        price = request.data.get('price', 0)
        image_url = request.data.get('image_url', '')
        description = request.data.get('description', '')

        if not product_id:
            return Response({
                'error': 'product_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if item already exists in wishlist
        wishlist_item, created = WishlistItem.objects.get_or_create(
            wishlist=wishlist,
            product_id=product_id,
            defaults={
                'product_name': product_name,
                'price': price,
                'image_url': image_url,
                'description': description,
            }
        )

        if not created:
            return Response({
                'message': 'Item already in wishlist',
                'item': WishlistItemSerializer(wishlist_item).data
            }, status=status.HTTP_200_OK)

        serializer = WishlistItemSerializer(wishlist_item)
        return Response({
            'message': 'Item added to wishlist',
            'item': serializer.data
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({
            'error': 'Failed to add item to wishlist',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_wishlist(request, item_id):
    """Remove item from wishlist"""
    try:
        wishlist = get_or_create_wishlist(request.user)
        wishlist_item = WishlistItem.objects.get(id=item_id, wishlist=wishlist)
        wishlist_item.delete()
        return Response({
            'message': 'Item removed from wishlist'
        }, status=status.HTTP_200_OK)

    except WishlistItem.DoesNotExist:
        return Response({
            'error': 'Wishlist item not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to remove item from wishlist',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_from_wishlist_by_product(request, product_id):
    """Remove item from wishlist by product_id"""
    try:
        wishlist = get_or_create_wishlist(request.user)
        wishlist_item = WishlistItem.objects.get(product_id=product_id, wishlist=wishlist)
        wishlist_item.delete()
        return Response({
            'message': 'Item removed from wishlist'
        }, status=status.HTTP_200_OK)

    except WishlistItem.DoesNotExist:
        return Response({
            'error': 'Wishlist item not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': 'Failed to remove item from wishlist',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)