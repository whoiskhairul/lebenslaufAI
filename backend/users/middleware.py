from django.utils import timezone
from ipware import get_client_ip
from .models import AuthAuditLog, UserSession

class SecurityAuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip, _ = get_client_ip(request)
        request.client_ip = ip or '127.0.0.1'
        request.user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')

        response = self.get_response(request)

        # Update last login IP and active session timestamp for authenticated users
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
            if user.last_login_ip != request.client_ip:
                user.last_login_ip = request.client_ip
                user.save(update_fields=['last_login_ip'])

            # Update UserSession if session key exists
            if request.session.session_key:
                UserSession.objects.filter(
                    user=user,
                    session_key=request.session.session_key
                ).update(last_activity=timezone.now(), is_active=True)

        return response
