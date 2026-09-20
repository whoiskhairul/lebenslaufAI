"""Session-bound JWT authentication.

Every issued access/refresh token carries a ``session_key`` claim that points
at a ``UserSession`` row. This class rejects tokens whose session is missing
or has been deactivated (logout, per-session revoke, password reset/change),
so session revocation actually invalidates JWTs instead of being cosmetic.

Tokens issued before this binding existed carry no ``session_key`` claim and
are rejected — a one-time re-login for all users on deploy.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed

from .models import UserSession


class SessionBoundJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        validated = super().get_validated_token(raw_token)

        session_key = validated.get('session_key')
        if not session_key:
            raise InvalidToken('Token has no session binding.')

        if not UserSession.objects.filter(
            session_key=session_key,
            user_id=validated.get('user_id'),
            is_active=True,
        ).exists():
            raise AuthenticationFailed(
                'Session has been revoked.', code='session_revoked'
            )

        return validated
