import uuid
from django.db import models
from django.conf import settings

STATUS_CHOICES = (
    ('wishlist', 'Wishlist'),
    ('preparing', 'Preparing'),
    ('applied', 'Applied'),
    ('interview', 'Interview'),
    ('offer', 'Offer'),
    ('rejected', 'Rejected'),
)

class Application(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications')
    company = models.CharField(max_length=255)
    position = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='wishlist')
    url = models.URLField(blank=True, null=True)
    salary = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    job_description = models.TextField(blank=True, null=True)
    contact_name = models.CharField(max_length=100, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    deadline = models.CharField(max_length=100, blank=True, null=True)
    
    # Store dynamic history tracking
    status_history = models.JSONField(default=list, blank=True) # list of {"status": "...", "date": "..."}
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def save(self, *args, **kwargs):
        # Automatically append history logs on state change
        if not self.status_history:
            self.status_history = []
        
        is_new = self._state.adding
        status_changed = False
        if not is_new:
            try:
                old_status = Application.objects.get(pk=self.id).status
                status_changed = old_status != self.status
            except Application.DoesNotExist:
                status_changed = True
        
        if is_new or status_changed:
            from django.utils.timezone import now
            self.status_history.append({
                "status": self.status,
                "date": now().isoformat()
            })
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.position} at {self.company} ({self.status})"
