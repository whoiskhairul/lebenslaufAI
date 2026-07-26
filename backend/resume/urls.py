from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ResumeVersionViewSet, CoverLetterVersionViewSet,
    ResumeTailorView, CoverLetterGenerateView, ResumeRephraseView, ATSScoreCheckView
)
from .ats_views import ATSScoreView, ATSOptimizeView, ATSRulesView

router = DefaultRouter(trailing_slash=False)
router.register('versions', ResumeVersionViewSet)
router.register('letters', CoverLetterVersionViewSet)

urlpatterns = [
    path('tailor', ResumeTailorView.as_view(), name='resume_tailor'),
    path('cover-letter', CoverLetterGenerateView.as_view(), name='cover_letter_generate'),
    path('rephrase', ResumeRephraseView.as_view(), name='resume_rephrase'),
    path('ats-check', ATSScoreCheckView.as_view(), name='ats_score_check'),
    path('ats/score', ATSScoreView.as_view(), name='ats_score'),
    path('ats/optimize', ATSOptimizeView.as_view(), name='ats_optimize'),
    path('ats/rules', ATSRulesView.as_view(), name='ats_rules'),
    path('', include(router.urls)),
]
