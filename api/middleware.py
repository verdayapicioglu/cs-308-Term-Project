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
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)
        return None

