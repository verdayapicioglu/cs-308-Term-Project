"""
Serializers for authentication API
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import CartItem, WishlistItem


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        label='Confirm Password'
    )
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=False, max_length=150, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'last_name')
        extra_kwargs = {
            'username': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            user = authenticate(request=self.context.get('request'),
                              username=username, password=password)
            if not user:
                raise serializers.ValidationError(
                    'Unable to log in with provided credentials.',
                    code='authorization'
                )
            if not user.is_active:
                raise serializers.ValidationError(
                    'User account is disabled.',
                    code='authorization'
                )
            attrs['user'] = user
        else:
            raise serializers.ValidationError(
                'Must include "username" and "password".',
                code='authorization'
            )
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            # Don't reveal if email exists or not for security
            pass
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    token = serializers.CharField(required=True)
    uid = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password2 = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        label='Confirm New Password'
    )

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({
                "new_password": "Password fields didn't match."
            })
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile extension"""
    class Meta:
        model = User
        fields = ('phone', 'bio', 'loyalty_tier', 'loyalty_points', 'pets_supported')
        # Note: This will be handled through UserProfile model


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    is_admin = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)
    profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'date_joined', 
                  'is_staff', 'is_superuser', 'is_admin', 'profile')
        read_only_fields = ('id', 'username', 'date_joined', 'is_staff', 'is_superuser')
    
    def get_is_admin(self, obj):
        """Check if user is admin (staff or superuser)"""
        return obj.is_staff or obj.is_superuser
    
    def get_profile(self, obj):
        """Get user profile data"""
        try:
            profile = obj.profile
            return {
                'phone': profile.phone or '',
                'bio': profile.bio or '',
                'loyalty_tier': profile.loyalty_tier or '',
                'loyalty_points': profile.loyalty_points or 0,
                'pets_supported': profile.pets_supported or 0,
            }
        except:
            # If profile doesn't exist, return empty profile
            return {
                'phone': '',
                'bio': '',
                'loyalty_tier': '',
                'loyalty_points': 0,
                'pets_supported': 0,
            }


class CartItemSerializer(serializers.ModelSerializer):
    """Serializer for cart items"""
    id = serializers.IntegerField(read_only=True)  # CartItem ID
    
    class Meta:
        model = CartItem
        fields = ('id', 'product_id', 'product_name', 'price', 'quantity', 
                  'image_url', 'description')
        read_only_fields = ('id',)
    
    def to_representation(self, instance):
        """Convert to frontend-compatible format"""
        data = super().to_representation(instance)
        # Convert Decimal to float for JSON
        data['price'] = float(data['price'])
        return data


class WishlistItemSerializer(serializers.ModelSerializer):
    """Serializer for wishlist items"""
    id = serializers.IntegerField(read_only=True)  # WishlistItem ID
    
    class Meta:
        model = WishlistItem
        fields = ('id', 'product_id', 'product_name', 'price', 
                  'image_url', 'description', 'created_at')
        read_only_fields = ('id', 'created_at')
    
    def to_representation(self, instance):
        """Convert to frontend-compatible format"""
        data = super().to_representation(instance)
        # Convert Decimal to float for JSON
        data['price'] = float(data['price'])
        if data.get('created_at'):
            data['created_at'] = instance.created_at.isoformat() if hasattr(instance.created_at, 'isoformat') else data['created_at']
        return data

