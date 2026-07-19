from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PersonalInfoViewSet, WorkExperienceViewSet, ProjectViewSet,
    SkillViewSet, EducationViewSet, CertificationViewSet, FullProfileView,
    ImportCVView
)

router = DefaultRouter(trailing_slash=False)
router.register('personal-info', PersonalInfoViewSet)
router.register('experience', WorkExperienceViewSet)
router.register('projects', ProjectViewSet)
router.register('skills', SkillViewSet)
router.register('education', EducationViewSet)
router.register('certifications', CertificationViewSet)

urlpatterns = [
    path('full', FullProfileView.as_view(), name='master_profile_full'),
    path('import-cv', ImportCVView.as_view(), name='import_cv'),
    path('', include(router.urls)),
]
