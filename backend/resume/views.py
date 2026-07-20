from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import ResumeVersion, CoverLetterVersion
from .serializers import ResumeVersionSerializer, CoverLetterVersionSerializer

from master_profile.models import (
    PersonalInfo, WorkExperience, Project, Skill, Education, Certification
)
from master_profile.serializers import FullProfileSerializer
from services.ai_service import AIService
from applications.models import Application

class ResumeVersionViewSet(viewsets.ModelViewSet):
    queryset = ResumeVersion.objects.all()
    serializer_class = ResumeVersionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CoverLetterVersionViewSet(viewsets.ModelViewSet):
    queryset = CoverLetterVersion.objects.all()
    serializer_class = CoverLetterVersionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ResumeTailorView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        job_description = request.data.get('job_description', '')
        if not job_description:
            return Response({
                "success": False,
                "error": {"message": "Job description text is required."}
            }, status=status.HTTP_400_BAD_REQUEST)
            
        company = request.data.get('company', '')
        position = request.data.get('position', '')
        template = request.data.get('template', 'modern_minimalist')
        application_id = request.data.get('application_id', None)

        # 1. Load User's Master Profile
        personal_info = PersonalInfo.objects.filter(user=user).first()
        if not personal_info:
            personal_info = PersonalInfo.objects.create(
                user=user,
                full_name=user.full_name or "",
                email=user.email
            )
            
        profile_data = {
            'personal_info': personal_info,
            'work_experiences': WorkExperience.objects.filter(user=user),
            'projects': Project.objects.filter(user=user),
            'skills': Skill.objects.filter(user=user),
            'educations': Education.objects.filter(user=user),
            'certifications': Certification.objects.filter(user=user),
        }
        
        profile_serialized = FullProfileSerializer(profile_data).data

        # Extract Client DeepSeek Key
        api_key = request.headers.get('X-Deepseek-Key', '').strip() or None

        # Fetch Application if ID is provided
        application = None
        if application_id:
            application = Application.objects.filter(user=user, id=application_id).first()

        # 2. Extract Job Details if not provided
        if not company or not position:
            job_details = AIService.parse_job_description(job_description, api_key=api_key)
            company = company or job_details.get('company', 'Target Company')
            position = position or job_details.get('position', 'Role Candidate')
        else:
            parsed_details = AIService.parse_job_description(job_description, api_key=api_key)
            job_details = {
                "company": company,
                "position": position,
                "keywords": parsed_details.get('keywords', [])
            }

        # Sync unedited job description to the application if linked
        if application:
            if not application.job_description:
                application.job_description = job_description
                application.save()

        # 3. Analyze ATS Score & Gaps
        ats_report = AIService.analyze_ats(profile_serialized, job_details, api_key=api_key)

        # 4. Tailor Resume Details
        tailored_result = AIService.tailor_resume(profile_serialized, job_details, api_key=api_key)

        # Agent 4: Run deterministic hallucination validator
        validation_alerts = AIService.validate_hallucinations(
            profile_serialized,
            tailored_result.get('tailored_summary', ''),
            tailored_result.get('tailored_experiences', [])
        )

        # Make JSON fields completely serializable by stringifying any nested UUID/datetime objects
        import json
        details_safe = json.loads(json.dumps({
            "experiences": tailored_result.get('tailored_experiences', []),
            "ats_report": ats_report,
            "original_profile": profile_serialized
        }, default=str))
        explanations_safe = json.loads(json.dumps(
            tailored_result.get('explanations', []),
            default=str
        ))

        save_version = request.data.get('save_version', True)

        # 5. Create immutable saved version
        if save_version:
            resume_version = ResumeVersion.objects.create(
                user=user,
                application=application,
                title=f"Resume for {position} at {company}",
                target_company=company,
                target_role=position,
                ats_score=ats_report.get('score', 70),
                tailored_summary=tailored_result.get('tailored_summary', ''),
                tailored_details=details_safe,
                explanations=explanations_safe,
                validation_alerts=validation_alerts,
                template=template
            )
            return Response({
                "success": True,
                "data": ResumeVersionSerializer(resume_version).data
            }, status=status.HTTP_201_CREATED)
        else:
            from datetime import datetime
            temp_version = ResumeVersion(
                user=user,
                application=application,
                title=f"Unsaved Resume for {position} at {company}",
                target_company=company,
                target_role=position,
                ats_score=ats_report.get('score', 70),
                tailored_summary=tailored_result.get('tailored_summary', ''),
                tailored_details=details_safe,
                explanations=explanations_safe,
                validation_alerts=validation_alerts,
                template=template
            )
            data = ResumeVersionSerializer(temp_version).data
            data["id"] = f"unsaved_{user.id}_{int(datetime.now().timestamp())}"
            return Response({
                "success": True,
                "data": data
            }, status=status.HTTP_200_OK)

class CoverLetterGenerateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        job_description = request.data.get('job_description', '')
        company = request.data.get('company', '')
        position = request.data.get('position', '')
        tone = request.data.get('tone', 'professional')
        length = request.data.get('length', 'medium')
        application_id = request.data.get('application_id', None)

        if not job_description:
            return Response({
                "success": False,
                "error": {"message": "Job description text is required."}
            }, status=status.HTTP_400_BAD_REQUEST)

        # Extract Client DeepSeek Key
        api_key = request.headers.get('X-Deepseek-Key', '').strip() or None

        # Fetch Application if ID is provided
        application = None
        if application_id:
            application = Application.objects.filter(user=user, id=application_id).first()

        # Ensure we have company and position names
        if not company or not position:
            parsed = AIService.parse_job_description(job_description, api_key=api_key)
            company = company or parsed.get('company', 'Target Company')
            position = position or parsed.get('position', 'Candidate')
            
        job_details = {
            "company": company,
            "position": position,
            "keywords": []
        }

        # Gather profile
        personal_info = PersonalInfo.objects.filter(user=user).first()
        profile_data = {
            'personal_info': personal_info or PersonalInfo(user=user, full_name=user.full_name or "", email=user.email),
            'work_experiences': WorkExperience.objects.filter(user=user),
            'projects': Project.objects.filter(user=user),
            'skills': Skill.objects.filter(user=user),
            'educations': Education.objects.filter(user=user),
            'certifications': Certification.objects.filter(user=user),
        }
        profile_serialized = FullProfileSerializer(profile_data).data

        # Call AI
        letter_content = AIService.write_cover_letter(profile_serialized, job_details, tone, length, api_key=api_key)

        # Create Letter record
        cover_letter = CoverLetterVersion.objects.create(
            user=user,
            application=application,
            target_company=company,
            target_role=position,
            content=letter_content,
            tone=tone,
            length=length
        )

        return Response({
            "success": True,
            "data": CoverLetterVersionSerializer(cover_letter).data
        }, status=status.HTTP_201_CREATED)

class ResumeRephraseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        text = request.data.get('text', '')
        instruction = request.data.get('instruction', '')
        
        if not text or not instruction:
            return Response({
                "success": False,
                "error": {"message": "Text and instruction are required."}
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Gather profile
        personal_info = PersonalInfo.objects.filter(user=user).first()
        profile_data = {
            'personal_info': personal_info or PersonalInfo(user=user, full_name=user.full_name or "", email=user.email),
            'work_experiences': WorkExperience.objects.filter(user=user),
            'projects': Project.objects.filter(user=user),
            'skills': Skill.objects.filter(user=user),
            'educations': Education.objects.filter(user=user),
            'certifications': Certification.objects.filter(user=user),
        }
        profile_serialized = FullProfileSerializer(profile_data).data
        
        api_key = request.headers.get('X-Deepseek-Key', '').strip() or None
        rephrased_text = AIService.rephrase_block(text, instruction, profile_serialized, api_key=api_key)
        
        return Response({
            "success": True,
            "rephrased_text": rephrased_text
        })
