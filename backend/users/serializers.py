import zxcvbn
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile, UserSession, AuthAuditLog

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            'bio', 'job_title', 'target_industry', 'phone_number',
            'location', 'website', 'github_url', 'linkedin_url',
            'created_at', 'updated_at'
        )


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'avatar', 'timezone', 'locale',
            'two_factor_enabled', 'email_verified', 'account_locked_until',
            'last_login_ip', 'date_joined', 'profile',
            'is_staff', 'is_active'
        )
        read_only_fields = (
            'id', 'email', 'two_factor_enabled', 'email_verified',
            'account_locked_until', 'last_login_ip', 'date_joined'
        )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('email', 'password', 'full_name')

    def validate_password(self, value):
        validate_password(value)
        # Check password strength using zxcvbn
        results = zxcvbn.zxcvbn(value)
        if results['score'] < 2:
            raise serializers.ValidationError(
                "Password is too weak. Please use a mix of uppercase, lowercase, numbers, and symbols."
            )
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', '')
        )
        # Auto-create UserProfile
        UserProfile.objects.get_or_create(user=user)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(default=False, required=False)
    totp_code = serializers.CharField(required=False, allow_blank=True)


class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        results = zxcvbn.zxcvbn(value)
        if results['score'] < 2:
            raise serializers.ValidationError("Password is too weak.")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        results = zxcvbn.zxcvbn(value)
        if results['score'] < 2:
            raise serializers.ValidationError("New password is too weak.")
        return value


class TwoFactorVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=10)


class UserSessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = ('id', 'session_key', 'ip_address', 'user_agent', 'device_info', 'created_at', 'last_activity', 'is_active', 'is_current')

    def get_is_current(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'session'):
            return obj.session_key == request.session.session_key
        return False


class AuthAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthAuditLog
        fields = ('id', 'event_type', 'ip_address', 'user_agent', 'details', 'timestamp')


class SocialLoginSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=['google', 'linkedin_oauth2', 'github'])
    access_token = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)
    id_token = serializers.CharField(required=False, allow_blank=True)
