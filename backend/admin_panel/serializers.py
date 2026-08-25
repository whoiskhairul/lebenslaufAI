from django.contrib.auth import get_user_model
from rest_framework import serializers

from applications.models import Application
from master_profile.models import (
    PersonalInfo, WorkExperience, Project, Skill, Education, Certification
)
from resume.models import ResumeVersion, CoverLetterVersion
from users.models import UserSession, AuthAuditLog

User = get_user_model()


class AdminUserListSerializer(serializers.ModelSerializer):
    resume_count = serializers.IntegerField(read_only=True)
    cover_letter_count = serializers.IntegerField(read_only=True)
    application_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'avatar', 'is_active', 'is_staff',
            'is_superuser', 'email_verified', 'two_factor_enabled',
            'last_login', 'last_login_ip', 'date_joined',
            'resume_count', 'cover_letter_count', 'application_count'
        )


class AdminUserDetailSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()
    personal_info = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'full_name', 'avatar', 'is_active', 'is_staff',
            'is_superuser', 'email_verified', 'two_factor_enabled',
            'account_locked_until', 'last_login', 'last_login_ip', 'date_joined',
            'profile', 'personal_info'
        )

    def get_profile(self, obj):
        profile = getattr(obj, 'profile', None)
        if not profile:
            return None
        return {
            'bio': profile.bio,
            'job_title': profile.job_title,
            'target_industry': profile.target_industry,
            'location': profile.location,
        }

    def get_personal_info(self, obj):
        info = getattr(obj, 'personal_info', None)
        if not info:
            return None
        return {
            'full_name': info.full_name,
            'title': info.title,
            'location': info.location,
        }


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('is_active', 'is_staff')


class AdminResumeSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    company = serializers.SerializerMethodField()
    position = serializers.SerializerMethodField()

    def get_company(self, obj):
        return obj.application.company if obj.application_id else None

    def get_position(self, obj):
        return obj.application.position if obj.application_id else None

    class Meta:
        model = ResumeVersion
        fields = (
            'id', 'user_id', 'user_email', 'title', 'target_company',
            'target_role', 'ats_score', 'template', 'company', 'position',
            'created_at'
        )


class AdminResumeDetailSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = ResumeVersion
        fields = (
            'id', 'user_email', 'user_full_name', 'title', 'target_company',
            'target_role', 'ats_score', 'tailored_summary', 'tailored_details',
            'explanations', 'validation_alerts', 'template', 'created_at'
        )


class AdminCoverLetterSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    company = serializers.SerializerMethodField()

    def get_company(self, obj):
        return obj.application.company if obj.application_id else None

    class Meta:
        model = CoverLetterVersion
        fields = (
            'id', 'user_id', 'user_email', 'target_company', 'target_role',
            'tone', 'length', 'company', 'created_at'
        )


class AdminApplicationSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)
    resume_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Application
        fields = (
            'id', 'user_id', 'user_email', 'company', 'position', 'status',
            'salary', 'location', 'resume_count', 'deadline',
            'created_at', 'updated_at'
        )


class AdminAuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True, default=None)

    class Meta:
        model = AuthAuditLog
        fields = ('id', 'user_email', 'event_type', 'ip_address', 'user_agent', 'details', 'timestamp')


class AdminSessionSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserSession
        fields = ('id', 'user_email', 'ip_address', 'user_agent', 'device_info', 'created_at', 'last_activity', 'is_active')
