import uuid
from django.db import models
from django.conf import settings

class PersonalInfo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='personal_info')
    full_name = models.CharField(max_length=255, blank=True, null=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    summary = models.TextField(blank=True, null=True)
    links = models.JSONField(default=list, blank=True)
    date_of_birth = models.CharField(max_length=100, blank=True, null=True)
    nationality = models.CharField(max_length=100, blank=True, null=True)
    linkedin = models.CharField(max_length=255, blank=True, null=True)
    github = models.CharField(max_length=255, blank=True, null=True)
    website = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.full_name or 'Info'} - {self.user.email}"

class WorkExperience(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='work_experiences')
    company = models.CharField(max_length=255)
    position = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.CharField(max_length=50, blank=True, null=True)
    end_date = models.CharField(max_length=50, blank=True, null=True)
    is_current = models.BooleanField(default=False)
    bullets = models.JSONField(default=list, blank=True) # list of bullet strings
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', '-start_date']

    def __str__(self):
        return f"{self.position} at {self.company}"

class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=255)
    role = models.CharField(max_length=255, blank=True, null=True)
    technologies = models.JSONField(default=list, blank=True) # list of technology strings
    bullets = models.JSONField(default=list, blank=True) # list of achievement bullet strings
    link = models.URLField(blank=True, null=True)
    date = models.CharField(max_length=50, blank=True, null=True) # e.g. "2017" or "2016"
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

class Skill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=100) # e.g., "Frontend", "Languages", "Tools"
    level = models.CharField(max_length=50, blank=True, null=True) # beginner, intermediate, expert
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['category', 'order', 'name']

    def __str__(self):
        return f"{self.name} ({self.category})"

class Education(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='educations')
    institution = models.CharField(max_length=255)
    degree = models.CharField(max_length=255, blank=True, null=True)
    field_of_study = models.CharField(max_length=255, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.CharField(max_length=50, blank=True, null=True)
    end_date = models.CharField(max_length=50, blank=True, null=True)
    is_current = models.BooleanField(default=False)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.degree} from {self.institution}"

class Certification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='certifications')
    name = models.CharField(max_length=255)
    authority = models.CharField(max_length=255, blank=True, null=True)
    issue_date = models.CharField(max_length=50, blank=True, null=True)
    credential_id = models.CharField(max_length=255, blank=True, null=True)
    credential_url = models.URLField(blank=True, null=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name
