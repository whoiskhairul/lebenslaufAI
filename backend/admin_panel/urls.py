from django.urls import path
from .views import (
    AdminMetricsView, AdminUserListView, AdminUserDetailView,
    AdminResumeListView, AdminResumeDetailView, AdminCoverLetterListView,
    AdminApplicationListView, AdminAuditLogListView, AdminSessionListView
)

urlpatterns = [
    path('metrics', AdminMetricsView.as_view(), name='admin_metrics'),
    path('users', AdminUserListView.as_view(), name='admin_users'),
    path('users/<uuid:user_id>', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('resumes', AdminResumeListView.as_view(), name='admin_resumes'),
    path('resumes/<uuid:resume_id>', AdminResumeDetailView.as_view(), name='admin_resume_detail'),
    path('cover-letters', AdminCoverLetterListView.as_view(), name='admin_cover_letters'),
    path('applications', AdminApplicationListView.as_view(), name='admin_applications'),
    path('audit-logs', AdminAuditLogListView.as_view(), name='admin_audit_logs'),
    path('sessions', AdminSessionListView.as_view(), name='admin_sessions'),
]
