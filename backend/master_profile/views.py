from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import (
    PersonalInfo, WorkExperience, Project, Skill, Education, Certification
)
from .serializers import (
    PersonalInfoSerializer, WorkExperienceSerializer, ProjectSerializer,
    SkillSerializer, EducationSerializer, CertificationSerializer,
    FullProfileSerializer
)



class PersonalInfoViewSet(viewsets.ModelViewSet):
    queryset = PersonalInfo.objects.all()
    serializer_class = PersonalInfoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class WorkExperienceViewSet(viewsets.ModelViewSet):
    queryset = WorkExperience.objects.all()
    serializer_class = WorkExperienceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class EducationViewSet(viewsets.ModelViewSet):
    queryset = Education.objects.all()
    serializer_class = EducationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CertificationViewSet(viewsets.ModelViewSet):
    queryset = Certification.objects.all()
    serializer_class = CertificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class FullProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Ensure PersonalInfo exists
        personal_info, _ = PersonalInfo.objects.get_or_create(
            user=user,
            defaults={
                "full_name": user.full_name or "",
                "email": user.email,
                "title": "",
                "phone": "",
                "location": "",
                "summary": "",
                "links": []
            }
        )

        data = {
            'personal_info': personal_info,
            'work_experiences': WorkExperience.objects.filter(user=user),
            'projects': Project.objects.filter(user=user),
            'skills': Skill.objects.filter(user=user),
            'educations': Education.objects.filter(user=user),
            'certifications': Certification.objects.filter(user=user),
        }
        
        serializer = FullProfileSerializer(data)
        return Response({
            "success": True,
            "data": serializer.data
        })

class ImportCVView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        import PyPDF2
        import json
        
        cv_text = request.data.get('cv_text', '')
        uploaded_file = request.FILES.get('file')
        
        if uploaded_file:
            if uploaded_file.name.endswith('.pdf'):
                try:
                    reader = PyPDF2.PdfReader(uploaded_file)
                    extracted_text = ""
                    for page in reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            extracted_text += page_text + "\n"
                    cv_text = extracted_text
                except Exception as e:
                    return Response({
                        "success": False,
                        "error": {"message": f"Failed to parse PDF file: {str(e)}"}
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                try:
                    cv_text = uploaded_file.read().decode('utf-8')
                except Exception as e:
                    return Response({
                        "success": False,
                        "error": {"message": f"Failed to read text file: {str(e)}"}
                    }, status=status.HTTP_400_BAD_REQUEST)

        if not cv_text or not cv_text.strip():
            return Response({
                "success": False,
                "error": {"message": "CV text content or uploaded file is required."}
            }, status=status.HTTP_400_BAD_REQUEST)

        api_key = request.headers.get('X-Deepseek-Key', '').strip() or None
        
        from services.ai_service import AIService
        parsed_cv = AIService.parse_resume_cv(cv_text, api_key=api_key)
        parsed_safe = json.loads(json.dumps(parsed_cv, default=str))

        return Response({
            "success": True,
            "data": parsed_safe
        })
