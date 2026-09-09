from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Avg, Q, F
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from applications.models import Application
from resume.models import ResumeVersion, CoverLetterVersion
from users.models import UserSession, AuthAuditLog

from .serializers import (
    AdminUserListSerializer, AdminUserDetailSerializer, AdminUserUpdateSerializer,
    AdminResumeSerializer, AdminResumeDetailSerializer, AdminCoverLetterSerializer,
    AdminApplicationSerializer, AdminAuditLogSerializer, AdminSessionSerializer
)

User = get_user_model()


def paginate(request, queryset):
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except (TypeError, ValueError):
        page_size = 20

    total = queryset.count()
    start = (page - 1) * page_size
    items = queryset[start:start + page_size]
    return {
        'items': items,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total': total,
            'total_pages': max(1, -(-total // page_size)),
        }
    }


class AdminPermission(permissions.IsAdminUser):
    pass


class AdminMetricsView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request):
        now = timezone.now()
        d7 = now - timedelta(days=7)
        d30 = now - timedelta(days=30)

        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        staff_count = User.objects.filter(is_staff=True).count()
        verified_count = User.objects.filter(email_verified=True).count()
        locked_count = User.objects.filter(account_locked_until__gt=now).count()
        new_users_7d = User.objects.filter(date_joined__gte=d7).count()
        new_users_30d = User.objects.filter(date_joined__gte=d30).count()

        resumes = ResumeVersion.objects.all()
        letters = CoverLetterVersion.objects.all()
        apps = Application.objects.all()

        total_resumes = resumes.count()
        total_letters = letters.count()
        total_apps = apps.count()

        avg_ats = resumes.aggregate(v=Avg('ats_score'))['v'] or 0

        # Time series: last 30 days of signups / CV generation / logins
        signup_series = list(
            User.objects.filter(date_joined__gte=d30)
            .annotate(day=TruncDate('date_joined'))
            .values('day').annotate(count=Count('id')).order_by('day')
        )
        resume_series = list(
            ResumeVersion.objects.filter(created_at__gte=d30)
            .annotate(day=TruncDate('created_at'))
            .values('day').annotate(count=Count('id')).order_by('day')
        )
        login_series = list(
            AuthAuditLog.objects.filter(
                event_type='LOGIN_SUCCESS', timestamp__gte=d30
            )
            .annotate(day=TruncDate('timestamp'))
            .values('day').annotate(count=Count('id')).order_by('day')
        )

        templates = list(
            resumes.values('template').annotate(count=Count('id')).order_by('-count')
        )

        apps_by_status = {
            row['status']: row['count']
            for row in apps.values('status').annotate(count=Count('id'))
        }

        top_users = list(
            User.objects.annotate(resume_count=Count('resume_versions'))
            .filter(resume_count__gt=0)
            .values('id', 'email', 'full_name', 'resume_count')
            .order_by('-resume_count')[:5]
        )

        recent_events = AuthAuditLog.objects.select_related('user')[:8]
        logins_7d = AuthAuditLog.objects.filter(
            event_type='LOGIN_SUCCESS', timestamp__gte=d7
        ).count()
        failed_logins_7d = AuthAuditLog.objects.filter(
            event_type='LOGIN_FAILED', timestamp__gte=d7
        ).count()

        def series_to_points(rows):
            return [{'date': r['day'].isoformat(), 'count': r['count']} for r in rows]

        return Response({
            'totals': {
                'users': total_users,
                'active_users': active_users,
                'staff': staff_count,
                'resumes': total_resumes,
                'cover_letters': total_letters,
                'applications': total_apps,
                'active_sessions': UserSession.objects.filter(is_active=True).count(),
            },
            'growth': {
                'new_users_7d': new_users_7d,
                'new_users_30d': new_users_30d,
                'new_resumes_7d': resumes.filter(created_at__gte=d7).count(),
                'new_resumes_30d': resumes.filter(created_at__gte=d30).count(),
                'logins_7d': logins_7d,
                'failed_logins_7d': failed_logins_7d,
            },
            'engagement': {
                'avg_ats_score': round(avg_ats),
                'avg_resumes_per_user': round(total_resumes / total_users, 2) if total_users else 0,
                'verified_pct': round(verified_count * 100 / total_users) if total_users else 0,
                'locked_accounts': locked_count,
            },
            'applications_by_status': apps_by_status,
            'templates': [
                {'template': t['template'], 'count': t['count']} for t in templates
            ],
            'signup_series': series_to_points(signup_series),
            'resume_series': series_to_points(resume_series),
            'login_series': series_to_points(login_series),
            'top_users': top_users,
            'recent_events': AdminAuditLogSerializer(recent_events, many=True).data,
        })


class AdminUserListView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request):
        qs = User.objects.annotate(
            resume_count=Count('resume_versions'),
            cover_letter_count=Count('cover_letters'),
            application_count=Count('applications'),
        ).order_by('-date_joined')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(full_name__icontains=search))

        flag = request.query_params.get('flag')
        if flag == 'staff':
            qs = qs.filter(is_staff=True)
        elif flag == 'inactive':
            qs = qs.filter(is_active=False)
        elif flag == 'unverified':
            qs = qs.filter(email_verified=False)

        data = paginate(request, qs)
        return Response({
            'results': AdminUserListSerializer(data['items'], many=True).data,
            'pagination': data['pagination'],
        })


class AdminUserDetailView(APIView):
    permission_classes = [AdminPermission]

    def _get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except (User.DoesNotExist, ValueError):
            return None

    def get(self, request, user_id):
        user = self._get_user(user_id)
        if not user:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        resumes = ResumeVersion.objects.filter(user=user)[:10]
        letters = CoverLetterVersion.objects.filter(user=user)[:10]
        events = AuthAuditLog.objects.filter(user=user)[:15]

        return Response({
            'user': AdminUserDetailSerializer(user).data,
            'stats': {
                'resumes': ResumeVersion.objects.filter(user=user).count(),
                'cover_letters': CoverLetterVersion.objects.filter(user=user).count(),
                'applications': Application.objects.filter(user=user).count(),
                'sessions': UserSession.objects.filter(user=user).count(),
            },
            'recent_resumes': AdminResumeSerializer(resumes, many=True).data,
            'recent_cover_letters': AdminCoverLetterSerializer(letters, many=True).data,
            'recent_audit_logs': AdminAuditLogSerializer(events, many=True).data,
        })

    def patch(self, request, user_id):
        user = self._get_user(user_id)
        if not user:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.id == request.user.id:
            return Response(
                {'detail': 'You cannot modify your own admin flags.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminUserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'user': AdminUserDetailSerializer(user).data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminResumeListView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request):
        qs = ResumeVersion.objects.select_related('user', 'application').order_by('-created_at')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(target_company__icontains=search) |
                Q(target_role__icontains=search) |
                Q(user__email__icontains=search)
            )

        template = request.query_params.get('template')
        if template:
            qs = qs.filter(template=template)

        ordering = request.query_params.get('ordering')
        if ordering == 'ats':
            qs = qs.order_by('ats_score')
        elif ordering == '-ats':
            qs = qs.order_by('-ats_score')

        data = paginate(request, qs)
        return Response({
            'results': AdminResumeSerializer(data['items'], many=True).data,
            'pagination': data['pagination'],
        })


class AdminResumeDetailView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request, resume_id):
        try:
            resume = ResumeVersion.objects.select_related('user').get(id=resume_id)
        except (ResumeVersion.DoesNotExist, ValueError):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AdminResumeDetailSerializer(resume).data)


class AdminCoverLetterListView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request):
        qs = CoverLetterVersion.objects.select_related('user', 'application').order_by('-created_at')

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(target_company__icontains=search) |
                Q(target_role__icontains=search) |
                Q(user__email__icontains=search)
            )

        data = paginate(request, qs)
        return Response({
            'results': AdminCoverLetterSerializer(data['items'], many=True).data,
            'pagination': data['pagination'],
        })


class AdminApplicationListView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request):
        qs = Application.objects.select_related('user').annotate(
            resume_count=Count('resume_versions')
        ).order_by(F('updated_at').desc(nulls_last=True), '-created_at')

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(company__icontains=search) |
                Q(position__icontains=search) |
                Q(user__email__icontains=search)
            )

        data = paginate(request, qs)
        return Response({
            'results': AdminApplicationSerializer(data['items'], many=True).data,
            'pagination': data['pagination'],
        })


class AdminAuditLogListView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request):
        qs = AuthAuditLog.objects.select_related('user').order_by('-timestamp')

        event_type = request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)

        data = paginate(request, qs)
        return Response({
            'results': AdminAuditLogSerializer(data['items'], many=True).data,
            'pagination': data['pagination'],
        })


class AdminSessionListView(APIView):
    permission_classes = [AdminPermission]

    def get(self, request):
        qs = UserSession.objects.select_related('user').filter(is_active=True).order_by('-last_activity')
        data = paginate(request, qs)
        return Response({
            'results': AdminSessionSerializer(data['items'], many=True).data,
            'pagination': data['pagination'],
        })
