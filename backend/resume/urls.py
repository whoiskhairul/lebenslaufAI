from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ResumeVersionViewSet, CoverLetterVersionViewSet,
    ResumeTailorView, CoverLetterGenerateView, ResumeRephraseView
)

router = DefaultRouter(trailing_slash=False)
router.register('versions', ResumeVersionViewSet)
router.register('letters', CoverLetterVersionViewSet)

urlpatterns = [
    path('tailor', ResumeTailorView.as_view(), name='resume_tailor'),
    path('cover-letter', CoverLetterGenerateView.as_view(), name='cover_letter_generate'),
    path('rephrase', ResumeRephraseView.as_view(), name='resume_rephrase'),
    path('', include(router.urls)),
]
