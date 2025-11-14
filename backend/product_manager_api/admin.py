"""
Django Admin configuration for Product Manager API
"""
from django.contrib import admin
from .models import Product, Order

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'model', 'category', 'price', 'quantity_in_stock', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('name', 'model', 'serial_number', 'description')
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

