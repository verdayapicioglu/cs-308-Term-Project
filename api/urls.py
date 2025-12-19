"""
API URL Configuration
"""
from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('user/', views.get_user, name='get_user'),
    path('user/profile/', views.update_user_profile, name='update_user_profile'),
    path('password-reset/', views.password_reset_request, name='password_reset_request'),
    path('password-reset-confirm/', views.password_reset_confirm, name='password_reset_confirm'),
    
    # Order endpoints
    path('orders/create/', views.create_order, name='create_order'),
    
    # Cart endpoints
    path('cart/', views.get_cart, name='get_cart'),
    path('cart/add/', views.add_to_cart, name='add_to_cart'),
    path('cart/merge/', views.merge_cart, name='merge_cart'),
    path('cart/clear/', views.clear_cart, name='clear_cart'),
    path('cart/item/<int:item_id>/', views.update_cart_item, name='update_cart_item'),
    path('cart/item/<int:item_id>/remove/', views.remove_from_cart, name='remove_from_cart'),
]

