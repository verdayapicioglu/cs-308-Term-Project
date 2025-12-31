"""
Django Admin configuration for Product Manager API
"""
from django.contrib import admin
from .models import Product, Order, Review, OrderItem, Category, Delivery

from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

# Re-register UserAdmin to show ID
admin.site.unregister(User)

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'username', 'email', 'first_name', 'last_name', 'is_staff')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # Tüm gerekli kolonlar: ID, name, model, serial_number, description, quantity_in_stock, price, warranty_status, distributor
    list_display = (
        'id', 
        'name', 
        'model', 
        'serial_number',
        'description',
        'quantity_in_stock', 
        'price',
        'warranty_status',
        'distributor',
        'category',
        'created_at'
    )
    list_filter = ('category', 'warranty_status', 'distributor', 'created_at')
    search_fields = ('name', 'model', 'serial_number', 'description', 'warranty_status', 'distributor', 'category')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'model', 'serial_number', 'description', 'category')
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'cost', 'quantity_in_stock')
        }),
        ('Additional Information', {
            'fields': ('warranty_status', 'distributor')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_name', 'price', 'quantity')

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('display_delivery_id', 'customer_name', 'total_price', 'status', 'order_date')
    
    def display_delivery_id(self, obj):
        return obj.delivery_id
    display_delivery_id.short_description = 'Order ID'
    display_delivery_id.admin_order_field = 'delivery_id'
    list_filter = ('status', 'order_date', 'delivery_date')
    search_fields = ('delivery_id', 'customer_name', 'customer_email', 'delivery_address')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [OrderItemInline]
    fieldsets = (
        ('Order Information', {
            'fields': ('delivery_id', 'status', 'order_date', 'delivery_date')
        }),
        ('Customer Information', {
            'fields': ('customer_id', 'customer_name', 'customer_email', 'delivery_address')
        }),
        ('Payment Information', {
            'fields': ('total_price',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'product_name', 'user_name', 'rating', 'status', 'created_at')
    list_filter = ('status', 'rating', 'created_at')
    search_fields = ('product_name', 'user_name', 'user_email', 'comment')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Comment Information', {
            'fields': ('product_id', 'product_name', 'rating', 'comment', 'status')
        }),
        ('User Information', {
            'fields': ('user_id', 'user_name', 'user_email')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    actions = ['approve_comments', 'reject_comments']
    
    def approve_comments(self, request, queryset):
        queryset.update(status='approved')
        self.message_user(request, f'{queryset.count()} comment(s) approved.')
    approve_comments.short_description = 'Approve selected comments'
    
    def reject_comments(self, request, queryset):
        queryset.update(status='rejected')
        self.message_user(request, f'{queryset.count()} comment(s) rejected.')
    reject_comments.short_description = 'Reject selected comments'


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_link', 'customer_id', 'product', 'quantity', 'total_price', 'is_completed', 'delivery_address', 'created_at')
    list_filter = ('is_completed', 'created_at')
    search_fields = ('order__delivery_id', 'customer__username', 'product__name', 'delivery_address')
    readonly_fields = ('created_at', 'updated_at')
    
    def order_link(self, obj):
        return obj.order.delivery_id
    order_link.short_description = 'Order ID'

