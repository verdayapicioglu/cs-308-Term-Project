from django.contrib import admin
from django.urls import path, include
from django.contrib.auth.views import LoginView, LogoutView
from django.conf import settings
from django.conf.urls.static import static
from core import views
from email_api import send_order_email_api

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Authentication API routes
    path('api/', include('api.urls')),
    
    # Email API
    path('api/send-order-email/', send_order_email_api, name='send_order_email'),
    
    # Product manager API routes
    path('', include('product_manager_api.urls')),
    
    # Support agents API routes
    path('api/support/', include('support_agents.urls')),
    
    # Legacy login/logout (for Django templates)
    path('login/', LoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('', LoginView.as_view(template_name='login.html'), name='home'),
]

from django.conf import settings
from django.conf.urls.static import static

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)