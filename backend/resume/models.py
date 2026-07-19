import uuid
from django.db import models
from django.conf import settings

TEMPLATE_CHOICES = (
    ('modern_minimalist', 'Modern Minimalist'),
    ('executive_professional', 'Executive Professional'),
    ('creative_tech', 'Creative Tech'),
    ('pixel_perfect_pdf', 'Pixel Perfect CV Template'),
    ('german_style_cv', 'German-Style CV Template'),
)

class ResumeVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resume_versions')
    application = models.ForeignKey('applications.Application', on_delete=models.CASCADE, null=True, blank=True, related_name='resume_versions')
    title = models.CharField(max_length=255)
    target_company = models.CharField(max_length=255)
    target_role = models.CharField(max_length=255)
    ats_score = models.IntegerField(default=0)
    
    # Store the fully tailored summary text
    tailored_summary = models.TextField(blank=True, null=True)
    
    # Store fully tailored components (experience bullets, projects, skills re-ordering)
    tailored_details = models.JSONField(default=dict, blank=True)
    
    # Store AI explanations tooltips
    explanations = models.JSONField(default=list, blank=True)
    
    # Store deterministic hallucination validation alerts
    validation_alerts = models.JSONField(default=list, blank=True)
    
    template = models.CharField(max_length=50, choices=TEMPLATE_CHOICES, default='modern_minimalist')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - Version for {self.target_company} ({self.created_at.strftime('%Y-%m-%d')})"

class CoverLetterVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cover_letters')
    application = models.ForeignKey('applications.Application', on_delete=models.CASCADE, null=True, blank=True, related_name='cover_letters')
    target_company = models.CharField(max_length=255)
    target_role = models.CharField(max_length=255)
    content = models.TextField()
    tone = models.CharField(max_length=50, default='professional')
    length = models.CharField(max_length=50, default='medium')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Letter for {self.target_company} ({self.created_at.strftime('%Y-%m-%d')})"
