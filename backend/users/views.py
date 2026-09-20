import os
import io
import base64

import uuid
import pyotp
import qrcode
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import UserProfile, UserSession, AuthAuditLog
from .serializers import (
    UserSerializer, UserProfileSerializer, RegisterSerializer,
    LoginSerializer, PasswordResetSerializer, PasswordResetConfirmSerializer,
    PasswordChangeSerializer, TwoFactorVerifySerializer, UserSessionSerializer,
    AuthAuditLogSerializer, SocialLoginSerializer
)

User = get_user_model()


def log_auth_event(user, event_type, request, details=None):
    ip = getattr(request, 'client_ip', '127.0.0.1')
    ua = getattr(request, 'user_agent', 'Unknown')
    AuthAuditLog.objects.create(
        user=user,
        event_type=event_type,
        ip_address=ip,
        user_agent=ua,
        details=details or {}
    )


def issue_session_tokens(user, request, lifetime_days=7, device_info=None):
    """Create a UserSession row and issue refresh/access tokens bound to it.

    Both tokens carry a ``session_key`` claim enforced by
    ``SessionBoundJWTAuthentication`` — deactivating the session row
    (logout, per-session revoke, password reset/change) invalidates
    the tokens.
    """
    session_key = str(uuid.uuid4())
    UserSession.objects.create(
        user=user,
        session_key=session_key,
        ip_address=getattr(request, 'client_ip', '127.0.0.1'),
        user_agent=getattr(request, 'user_agent', 'Unknown'),
        device_info=(device_info or request.headers.get('User-Agent', 'Web Browser'))[:250]
    )
    refresh = RefreshToken.for_user(user)
    refresh.set_exp(lifetime=timedelta(days=lifetime_days))
    refresh['session_key'] = session_key
    access = refresh.access_token
    access['session_key'] = session_key
    return refresh, session_key


def register_failed_attempt(user, request, reason):
    """Count a failed auth attempt toward brute-force lockout (5 → 15 min)."""
    user.login_attempts_count += 1
    if user.login_attempts_count >= 5:
        user.account_locked_until = timezone.now() + timedelta(minutes=15)
        log_auth_event(user, 'LOCKOUT', request, {"reason": "5 consecutive failed attempts"})
    user.save(update_fields=['login_attempts_count', 'account_locked_until'])
    log_auth_event(user, 'LOGIN_FAILED', request, {"reason": reason} if reason else None)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = str(uuid.uuid4())
            user.email_verification_token = token
            user.save(update_fields=['email_verification_token'])

            log_auth_event(user, 'REGISTER', request)

            # Send verification email
            verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}&email={user.email}"
            try:
                send_mail(
                    subject="Verify your Lebenslauf AI Account",
                    message=f"Hello {user.full_name or user.email},\n\nPlease verify your account by clicking the link below:\n{verify_url}\n\nThank you!",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                pass

            return Response({
                "message": "Registration successful. Please check your email to verify your account.",
                "user": UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        token = request.data.get('token')
        if not email or not token:
            return Response({"error": "Email and token are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email, email_verification_token=token)
            user.email_verified = True
            user.email_verification_token = None
            user.save(update_fields=['email_verified', 'email_verification_token'])
            return Response({"message": "Email verified successfully. You can now log in."})
        except User.DoesNotExist:
            return Response({"error": "Invalid or expired verification token."}, status=status.HTTP_400_BAD_REQUEST)


class EmailVerifyResendView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            if user.email_verified:
                return Response({"message": "Email is already verified."})
            
            token = str(uuid.uuid4())
            user.email_verification_token = token
            user.save(update_fields=['email_verification_token'])

            verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}&email={user.email}"
            send_mail(
                subject="Verify your Lebenslauf AI Account",
                message=f"Verification link:\n{verify_url}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
            return Response({"message": "Verification email resent."})
        except User.DoesNotExist:
            return Response({"message": "If an account exists with this email, a verification link was sent."})


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        remember_me = serializer.validated_data.get('remember_me', False)
        totp_code = serializer.validated_data.get('totp_code')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        # Check brute force lockout — generic message so locked accounts
        # are indistinguishable from bad credentials (no enumeration).
        if user.account_locked_until and user.account_locked_until > timezone.now():
            log_auth_event(user, 'LOGIN_FAILED', request, {"reason": "locked account attempt"})
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        authenticated_user = authenticate(username=email, password=password)
        if not authenticated_user:
            register_failed_attempt(user, request, reason="bad password")
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        # Reset failed login count
        user.login_attempts_count = 0
        user.account_locked_until = None
        user.save(update_fields=['login_attempts_count', 'account_locked_until'])

        # 2FA Check if enabled
        if user.two_factor_enabled:
            if not totp_code:
                return Response({
                    "two_factor_required": True,
                    "message": "Two-factor authentication code required."
                }, status=status.HTTP_200_OK)

            totp = pyotp.TOTP(user.two_factor_secret)
            if totp.verify(totp_code, valid_window=1):
                pass  # TOTP accepted
            elif totp_code in (user.two_factor_recovery_codes or []):
                # Recovery codes are single-use: consume immediately.
                user.two_factor_recovery_codes = [
                    c for c in (user.two_factor_recovery_codes or []) if c != totp_code
                ]
                user.save(update_fields=['two_factor_recovery_codes'])
            else:
                # Failed 2FA codes count toward lockout — TOTP is only
                # ~1M combinations and must not be freely brute-forced.
                register_failed_attempt(user, request, reason="Invalid 2FA code")
                return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        # Create session-bound JWT Tokens
        refresh, session_key = issue_session_tokens(
            user, request, lifetime_days=30 if remember_me else 7
        )

        log_auth_event(user, 'LOGIN_SUCCESS', request, {"remember_me": remember_me})

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "session_key": session_key
        })


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            session_key = request.data.get("session_key")
            if session_key:
                UserSession.objects.filter(user=request.user, session_key=session_key).update(is_active=False)

            log_auth_event(request.user, 'LOGOUT', request)
            return Response({"message": "Logged out successfully."})
        except Exception as e:
            return Response({"error": "Invalid token or logout failed."}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email)
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

            send_mail(
                subject="Reset your Lebenslauf AI Password",
                message=f"Hello,\n\nYou requested a password reset. Click the link below to set a new password:\n{reset_url}\n\nIf you did not request this, please ignore this email.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
            log_auth_event(user, 'PASSWORD_RESET_REQ', request)
        except User.DoesNotExist:
            pass

        return Response({"message": "If an account with that email exists, password reset instructions have been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uid_b64 = request.data.get('uid')
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            uid = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid user identification."}, status=status.HTTP_400_BAD_REQUEST)

        if default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            # Deactivate all active sessions on password reset
            UserSession.objects.filter(user=user).update(is_active=False)
            log_auth_event(user, 'PASSWORD_RESET_CONF', request)
            return Response({"message": "Password reset successfully. You can now log in with your new password."})
        
        return Response({"error": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({"error": "Incorrect current password."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        # Revoke other sessions on password change
        UserSession.objects.filter(user=user).update(is_active=False)
        log_auth_event(user, 'PASSWORD_CHANGE', request)
        return Response({"message": "Password changed successfully."})


class TwoFactorSetupView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.two_factor_secret:
            user.two_factor_secret = pyotp.random_base32()
            # Generate 5 recovery codes
            recovery_codes = [str(uuid.uuid4())[:8] for _ in range(5)]
            user.two_factor_recovery_codes = recovery_codes
            user.save(update_fields=['two_factor_secret', 'two_factor_recovery_codes'])

        totp = pyotp.TOTP(user.two_factor_secret)
        otpauth_url = totp.provisioning_uri(name=user.email, issuer_name="Lebenslauf AI")

        # Generate QR code image as base64 string
        qr = qrcode.QRCode(version=1, box_size=8, border=2)
        qr.add_data(otpauth_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return Response({
            "secret": user.two_factor_secret,
            "qr_code": f"data:image/png;base64,{qr_base64}",
            "recovery_codes": user.two_factor_recovery_codes,
            "two_factor_enabled": user.two_factor_enabled
        })


class TwoFactorVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TwoFactorVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        code = serializer.validated_data['code']

        if not user.two_factor_secret:
            return Response({"error": "2FA setup is not initialized."}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(user.two_factor_secret)
        if totp.verify(code, valid_window=1):
            user.two_factor_enabled = True
            user.save(update_fields=['two_factor_enabled'])
            log_auth_event(user, '2FA_ENABLED', request)
            return Response({"message": "Two-factor authentication enabled successfully."})

        return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)


class TwoFactorDisableView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')
        if not password or not request.user.check_password(password):
            return Response({"error": "Password confirmation required to disable 2FA."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.two_factor_enabled = False
        user.two_factor_secret = None
        user.two_factor_recovery_codes = []
        user.save(update_fields=['two_factor_enabled', 'two_factor_secret', 'two_factor_recovery_codes'])
        log_auth_event(user, '2FA_DISABLED', request)
        return Response({"message": "Two-factor authentication disabled."})


class SessionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user, is_active=True).order_by('-last_activity')
        serializer = UserSessionSerializer(sessions, many=True, context={'request': request})
        return Response(serializer.data)


class SessionRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = UserSession.objects.get(id=session_id, user=request.user)
            session.is_active = False
            session.save(update_fields=['is_active'])
            log_auth_event(request.user, 'SESSION_REVOKED', request, {"session_id": str(session_id)})
            return Response({"message": "Session revoked successfully."})
        except UserSession.DoesNotExist:
            return Response({"error": "Session not found."}, status=status.HTTP_404_NOT_FOUND)


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response({
            "user": UserSerializer(request.user).data,
            "profile": UserProfileSerializer(profile).data
        })

    def patch(self, request):
        user = request.user
        user_serializer = UserSerializer(user, data=request.data, partial=True)
        if user_serializer.is_valid():
            user_serializer.save()

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile_data = request.data.get('profile', {})
        profile_serializer = UserProfileSerializer(profile, data=profile_data, partial=True)
        if profile_serializer.is_valid():
            profile_serializer.save()

        return Response({
            "user": UserSerializer(user).data,
            "profile": UserProfileSerializer(profile).data
        })


class AccountDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')
        if not password or not request.user.check_password(password):
            return Response({"error": "Valid password required to delete account."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.delete()
        return Response({"message": "Account deleted successfully."})


import requests

class SocialLoginView(APIView):
    """OAuth login that ONLY trusts provider-verified identities.

    The client must supply a provider ``access_token`` which we verify
    live against the provider's userinfo API. Email/name/avatar are taken
    exclusively from the verified provider response — self-asserted
    request fields are never trusted (they previously allowed
    impersonation of any account).
    """
    permission_classes = [permissions.AllowAny]

    def _verify_with_provider(self, provider, access_token):
        """Return (email, full_name, avatar, email_verified) or None."""
        headers = {'Authorization': f'Bearer {access_token}'}
        try:
            if provider == 'google':
                resp = requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers=headers, timeout=10,
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()
                if not data.get('email'):
                    return None
                return (
                    data.get('email'),
                    data.get('name') or '',
                    data.get('picture') or '',
                    data.get('email_verified', True),
                )
            if provider == 'github':
                resp = requests.get(
                    'https://api.github.com/user', headers=headers, timeout=10,
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()
                emails_resp = requests.get(
                    'https://api.github.com/user/emails', headers=headers, timeout=10,
                )
                email = None
                if emails_resp.status_code == 200:
                    for entry in emails_resp.json():
                        if entry.get('primary') and entry.get('verified'):
                            email = entry.get('email')
                            break
                if not email:
                    return None
                return (
                    email,
                    data.get('name') or data.get('login') or '',
                    data.get('avatar_url') or '',
                    True,
                )
            if provider == 'linkedin_oauth2':
                resp = requests.get(
                    'https://api.linkedin.com/v2/userinfo', headers=headers, timeout=10,
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()
                if not data.get('email'):
                    return None
                return (
                    data.get('email'),
                    data.get('name') or '',
                    data.get('picture') or '',
                    data.get('email_verified', True),
                )
        except Exception:
            return None
        return None

    def post(self, request):
        serializer = SocialLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        provider = serializer.validated_data['provider']
        access_token = serializer.validated_data.get('access_token') or request.data.get('access_token')
        if not access_token:
            return Response(
                {"error": "Provider access token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verified = self._verify_with_provider(provider, access_token)
        if not verified:
            log_auth_event(None, 'LOGIN_FAILED', request, {"reason": f"Invalid {provider} token"})
            return Response(
                {"error": "Could not verify identity with the OAuth provider."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        email, full_name, avatar, email_verified = verified
        if not email_verified:
            return Response(
                {"error": "OAuth email address is not verified with the provider."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'full_name': full_name or email.split('@')[0],
                'email_verified': True,
                'avatar': avatar or ''
            }
        )

        if avatar and not user.avatar:
            user.avatar = avatar
            user.save(update_fields=['avatar'])

        refresh, session_key = issue_session_tokens(
            user, request, lifetime_days=7,
            device_info=f'Social OAuth ({provider}) Web Session',
        )

        log_auth_event(user, 'SOCIAL_LOGIN', request, {"provider": provider, "flow": "client_api"})

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "session_key": session_key,
            "created": created
        })



from django.shortcuts import redirect

class SocialOAuthRedirectView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, provider):
        provider_map = {
            'google': '/accounts/google/login/',
            'github': '/accounts/github/login/',
            'linkedin': '/accounts/linkedin_oauth2/login/',
        }
        target_url = provider_map.get(provider)
        if target_url:
            return redirect(target_url)
        return Response({"error": "Invalid provider."}, status=status.HTTP_400_BAD_REQUEST)




class SocialCallbackRedirectView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
            refresh, session_key = issue_session_tokens(
                user, request, lifetime_days=7,
                device_info='Social OAuth Web Session',
            )

            log_auth_event(user, 'SOCIAL_LOGIN', request, {"auth_method": "OAuth2"})

            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # Redirect to React SPA with tokens
            frontend_redirect = f"{settings.FRONTEND_URL}/login?access={access_token}&refresh={refresh_token}&session_key={session_key}"
            return redirect(frontend_redirect)

        return redirect(f"{settings.FRONTEND_URL}/login?error=OAuthAuthenticationFailed")


from rest_framework_simplejwt.views import TokenRefreshView


class SessionTokenRefreshView(TokenRefreshView):
    """Refresh rotation that also enforces the session binding.

    The stock view only checks signature/expiry, so a refresh token from
    a revoked session could mint fresh access tokens indefinitely.
    Here the presented refresh token must carry a live ``session_key``;
    revoked/missing sessions are rejected and the token is blacklisted.
    """

    def post(self, request, *args, **kwargs):
        raw = request.data.get('refresh')
        if raw:
            try:
                candidate = RefreshToken(raw)
                session_key = candidate.get('session_key')
                session_ok = bool(session_key) and UserSession.objects.filter(
                    session_key=session_key, is_active=True
                ).exists()
                if not session_ok:
                    try:
                        candidate.blacklist()
                    except Exception:
                        pass
                    return Response(
                        {"detail": "Session has been revoked."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
            except TokenError:
                pass  # fall through to the stock handler for the standard error
        return super().post(request, *args, **kwargs)

