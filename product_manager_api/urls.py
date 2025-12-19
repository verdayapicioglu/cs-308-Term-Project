"""
Product Manager API URLs
"""
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    path('delivery/dashboard/stats/', views.delivery_dashboard_stats, name='delivery_dashboard_stats'),
    
    # Product Management
    path('products/', views.product_list_create, name='product_list_create'),
    path('products/<int:product_id>/', views.product_detail, name='product_detail'),
    
    # Category Management
    path('categories/', views.category_list_create, name='category_list_create'),
    path('categories/<str:category_name>/', views.category_delete, name='category_delete'),
    
    # Stock Management
    path('stock/', views.stock_list, name='stock_list'),
    path('stock/<int:product_id>/', views.stock_update, name='stock_update'),
    
    # --- Order/Delivery Management (DÜZELTİLDİ) ---
    # ÖNEMLİ: 'create' gibi özel kelimeler, değişken parametrelerden (<str:delivery_id>) ÖNCE gelmeli.
    
    # 1. Önce özel yollar
    path('orders/create/', views.create_order, name='create_order'),
    
    # Not: views.py dosyanızda 'order_history' fonksiyonu yoksa bu satır hata verebilir.
    # Eğer hata alırsanız başına # koyarak yorum satırı yapın.
    path('orders/history/', views.order_history, name='order_history'), 

    # 2. Sonra listeleme
    path('orders/', views.order_list, name='order_list'),

    # 3. En son ID parametresi alanlar (Wildcard)
    path('orders/<str:delivery_id>/status/', views.order_update_status, name='order_update_status'),
    path('orders/<str:delivery_id>/', views.order_detail, name='order_detail'),

    
    # Comment Approval
    path('comments/', views.comment_list, name='comment_list'),
    path('comments/create/', views.review_create, name='review_create'),
    path('comments/<int:comment_id>/approve/', views.comment_approve, name='comment_approve'),
]