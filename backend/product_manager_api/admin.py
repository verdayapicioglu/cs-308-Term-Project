"""
Django Admin configuration for Product Manager API
"""
from django.contrib import admin
from .models import Product, Order, Review

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # Tüm gerekli kolonlar list display'de görünecek
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

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('delivery_id', 'customer_name', 'product_name', 'quantity', 'total_price', 'status', 'order_date')
    list_filter = ('status', 'order_date', 'delivery_date')
    search_fields = ('delivery_id', 'customer_name', 'customer_email', 'product_name', 'delivery_address')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Order Information', {
            'fields': ('delivery_id', 'status', 'order_date', 'delivery_date')
        }),
        ('Customer Information', {
            'fields': ('customer_id', 'customer_name', 'customer_email', 'delivery_address')
        }),
        ('Product Information', {
            'fields': ('product_id', 'product_name', 'quantity', 'total_price')
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
