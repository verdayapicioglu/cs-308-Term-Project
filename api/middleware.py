"""
Custom middleware to exempt API views from CSRF
"""
from django.utils.deprecation import MiddlewareMixin
from django.views.decorators.csrf import csrf_exempt


class DisableCSRFForAPI(MiddlewareMixin):
    """
    Middleware to disable CSRF for API endpoints
    """
    def process_request(self, request):
        if (request.path.startswith('/api/') or 
            request.path.startswith('/orders/') or 
            request.path.startswith('/products/') or 
            request.path.startswith('/comments/') or
            request.path.startswith('/stock/') or
            request.path.startswith('/categories/') or
            request.path.startswith('/delivery/') or
            request.path.startswith('/dashboard/')):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None

