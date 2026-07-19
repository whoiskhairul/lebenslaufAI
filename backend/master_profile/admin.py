from django.contrib import admin
from .models import PersonalInfo, WorkExperience, Project, Skill, Education, Certification

@admin.register(PersonalInfo)
class PersonalInfoAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'title', 'email', 'user')
    search_fields = ('full_name', 'title', 'email', 'user__email')

@admin.register(WorkExperience)
class WorkExperienceAdmin(admin.ModelAdmin):
    list_display = ('position', 'company', 'user', 'start_date', 'end_date', 'is_current', 'order')
    list_filter = ('is_current', 'company')
    search_fields = ('position', 'company', 'user__email')
    ordering = ('user', 'order', '-start_date')

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'role', 'user', 'order')
    search_fields = ('title', 'role', 'user__email')
    ordering = ('user', 'order')

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'level', 'user', 'order')
    list_filter = ('category', 'level')
    search_fields = ('name', 'category', 'user__email')
    ordering = ('user', 'category', 'order', 'name')

@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ('degree', 'institution', 'user', 'start_date', 'end_date', 'order')
    search_fields = ('degree', 'institution', 'user__email')
    ordering = ('user', 'order')

@admin.register(Certification)
class CertificationAdmin(admin.ModelAdmin):
    list_display = ('name', 'authority', 'user', 'order')
    search_fields = ('name', 'authority', 'user__email')
    ordering = ('user', 'order')
