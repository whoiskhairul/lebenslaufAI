from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('api/v1/users/', include('users.urls')),
    path('api/v1/auth/', include('users.urls')),
    path('api/v1/master-profile/', include('master_profile.urls')),
    path('api/v1/resume/', include('resume.urls')),
    path('api/v1/', include('applications.urls')),
]


