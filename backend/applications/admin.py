from django.contrib import admin
from .models import Application

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('position', 'company', 'status', 'location', 'salary', 'deadline', 'user', 'updated_at')
    list_filter = ('status', 'company')
    search_fields = ('position', 'company', 'user__email')
    ordering = ('-updated_at',)
