from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApplicationViewSet

router = DefaultRouter(trailing_slash=False)
router.register('applications', ApplicationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
