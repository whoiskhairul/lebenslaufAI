from django.contrib import admin
from .models import ResumeVersion, CoverLetterVersion

@admin.register(ResumeVersion)
class ResumeVersionAdmin(admin.ModelAdmin):
    list_display = ('title', 'target_company', 'target_role', 'ats_score', 'template', 'user', 'created_at')
    list_filter = ('template', 'ats_score')
    search_fields = ('title', 'target_company', 'target_role', 'user__email')
    ordering = ('-created_at',)

@admin.register(CoverLetterVersion)
class CoverLetterVersionAdmin(admin.ModelAdmin):
    list_display = ('target_company', 'target_role', 'tone', 'length', 'user', 'created_at')
    list_filter = ('tone', 'length')
    search_fields = ('target_company', 'target_role', 'user__email')
    ordering = ('-created_at',)
