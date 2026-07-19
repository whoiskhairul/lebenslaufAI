from rest_framework import serializers
from .models import ResumeVersion, CoverLetterVersion

class ResumeVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeVersion
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')

class CoverLetterVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoverLetterVersion
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at')
