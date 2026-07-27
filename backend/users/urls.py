from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, EmailVerifyView, EmailVerifyResendView,
    LoginView, LogoutView, PasswordResetRequestView, PasswordResetConfirmView,
    PasswordChangeView, TwoFactorSetupView, TwoFactorVerifyView, TwoFactorDisableView,
    SessionListView, SessionRevokeView, UserProfileView, AccountDeleteView,
    SocialLoginView, SocialOAuthRedirectView, SocialCallbackRedirectView
)

urlpatterns = [
    # Auth & Identity Endpoints
    path('auth/register', RegisterView.as_view(), name='auth_register'),
    path('auth/verify-email', EmailVerifyView.as_view(), name='auth_verify_email'),
    path('auth/resend-verification', EmailVerifyResendView.as_view(), name='auth_resend_verification'),
    path('auth/login', LoginView.as_view(), name='auth_login'),
    path('auth/logout', LogoutView.as_view(), name='auth_logout'),
    path('auth/refresh', TokenRefreshView.as_view(), name='auth_refresh'),
    path('auth/password-reset', PasswordResetRequestView.as_view(), name='auth_password_reset'),
    path('auth/password-reset-confirm', PasswordResetConfirmView.as_view(), name='auth_password_reset_confirm'),
    path('auth/password-change', PasswordChangeView.as_view(), name='auth_password_change'),
    path('auth/social-login', SocialLoginView.as_view(), name='auth_social_login'),
    path('auth/social-<str:provider>', SocialOAuthRedirectView.as_view(), name='auth_social_redirect'),
    path('auth/social-callback', SocialCallbackRedirectView.as_view(), name='auth_social_callback'),

    # 2FA Security Endpoints
    path('security/2fa/setup', TwoFactorSetupView.as_view(), name='security_2fa_setup'),
    path('security/2fa/verify', TwoFactorVerifyView.as_view(), name='security_2fa_verify'),
    path('security/2fa/disable', TwoFactorDisableView.as_view(), name='security_2fa_disable'),

    # Sessions & Account Management
    path('security/sessions', SessionListView.as_view(), name='security_sessions'),
    path('security/sessions/<uuid:session_id>/revoke', SessionRevokeView.as_view(), name='security_session_revoke'),
    path('account/profile', UserProfileView.as_view(), name='account_profile'),
    path('account/delete', AccountDeleteView.as_view(), name='account_delete'),
]
