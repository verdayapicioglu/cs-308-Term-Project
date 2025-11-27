"""
Product Manager API URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    
    # Product Management
    path('products/', views.product_list_create, name='product_list_create'),
    path('products/<int:product_id>/', views.product_detail, name='product_detail'),
    
    # Category Management
    path('categories/', views.category_list_create, name='category_list_create'),
    path('categories/<str:category_name>/', views.category_delete, name='category_delete'),
    
    # Stock Management
    path('stock/', views.stock_list, name='stock_list'),
    path('stock/<int:product_id>/', views.stock_update, name='stock_update'),
    
    # Order/Delivery Management
    # Note: More specific paths must come before less specific ones
    path('orders/history/', views.user_order_history, name='user_order_history'),
    path('orders/create/', views.create_order, name='create_order'),
    path('orders/<str:delivery_id>/status/', views.order_update_status, name='order_update_status'),
    path('orders/<str:delivery_id>/', views.order_detail, name='order_detail'),
    path('orders/', views.order_list, name='order_list'),
    
    # Comment Approval
    path('comments/', views.comment_list, name='comment_list'),
    path('comments/create/', views.review_create, name='review_create'),
    path('comments/<int:comment_id>/approve/', views.comment_approve, name='comment_approve'),
]
