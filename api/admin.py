from django.contrib import admin
from .models import UserProfile, Order, OrderItem, Cart, CartItem

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'loyalty_tier', 'loyalty_points', 'pets_supported')
    list_filter = ('loyalty_tier',)
    search_fields = ('user__username', 'user__email', 'phone')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'delivery_address', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email', 'delivery_address')

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'product_name', 'quantity', 'price')
    list_filter = ('order',)
    search_fields = ('product_name',)

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('user__username', 'user__email')

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'cart', 'product_name', 'product_id', 'quantity', 'price')
    list_filter = ('cart',)
    search_fields = ('product_name', 'product_id')