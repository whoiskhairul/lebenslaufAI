from rest_framework import serializers
from .models import (
    PersonalInfo, WorkExperience, Project, Skill, Education, Certification
)

class PersonalInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PersonalInfo
        fields = '__all__'
        read_only_fields = ('id', 'user')

class WorkExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkExperience
        fields = '__all__'
        read_only_fields = ('id', 'user')

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ('id', 'user')

    def to_internal_value(self, data):
        # Clean URL link field if present in data
        if 'link' in data and data['link']:
            link_val = str(data['link']).strip()
            if link_val and not link_val.lower().startswith(('http://', 'https://')):
                if hasattr(data, '_mutable'):
                    data = data.copy()
                data['link'] = 'https://' + link_val
        return super().to_internal_value(data)

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = '__all__'
        read_only_fields = ('id', 'user')

class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = '__all__'
        read_only_fields = ('id', 'user')

class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = '__all__'
        read_only_fields = ('id', 'user')

# Bundled serializer for loading the full profile in a single call
class FullProfileSerializer(serializers.Serializer):
    personal_info = PersonalInfoSerializer(required=False)
    work_experiences = WorkExperienceSerializer(many=True, required=False)
    projects = ProjectSerializer(many=True, required=False)
    skills = SkillSerializer(many=True, required=False)
    educations = EducationSerializer(many=True, required=False)
    certifications = CertificationSerializer(many=True, required=False)
