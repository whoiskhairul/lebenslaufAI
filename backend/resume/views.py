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
        target_language = request.data.get('target_language', 'en')
        selected_project_ids = request.data.get('selected_project_ids', None)
        aggressive_mode = request.data.get('aggressive_mode', False)

        # 1. Load User's Master Profile
        personal_info = PersonalInfo.objects.filter(user=user).first()
        if not personal_info:
            personal_info = PersonalInfo.objects.create(
                user=user,
                full_name=user.full_name or "",
                email=user.email
            )

        projects_qs = Project.objects.filter(user=user)
        if selected_project_ids is not None and isinstance(selected_project_ids, list):
            projects_qs = projects_qs.filter(id__in=selected_project_ids)

        profile_data = {
            'personal_info': personal_info,
            'work_experiences': WorkExperience.objects.filter(user=user),
            'projects': projects_qs,
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

        try:
            # 2. Extract Job Details if missing
            if not company or not position:
                job_details = AIService.parse_job_description(job_description, api_key=api_key)
                company = company or job_details.get('company', 'Target Company')
                position = position or job_details.get('position', 'Role Candidate')
            else:
                job_details = {
                    "company": company,
                    "position": position,
                    "keywords": []
                }

            # Sync unedited job description to the application if linked
            if application:
                if not application.job_description:
                    application.job_description = job_description
                    application.save()

            # 3. Single-Pass DeepSeek Tailoring & ATS Auditing
            tailored_result = AIService.tailor_resume(profile_serialized, job_details, api_key=api_key, target_language=target_language, aggressive_mode=aggressive_mode)

            # Retrieve single-pass ats_report or fallback if missing
            ats_report = tailored_result.get('ats_report')
            if not ats_report or not isinstance(ats_report, dict) or 'score' not in ats_report:
                tailored_profile_data = {
                    "personal_info": profile_serialized.get('personal_info', {}),
                    "summary": tailored_result.get('tailored_summary', ''),
                    "work_experiences": tailored_result.get('tailored_experiences', []),
                    "skills": tailored_result.get('tailored_skills', profile_serialized.get('skills', [])),
                    "projects": tailored_result.get('tailored_projects', profile_serialized.get('projects', [])),
                    "educations": profile_serialized.get('educations', [])
                }
                ats_report = AIService.analyze_ats(tailored_profile_data, job_details, api_key=api_key)
        except ValueError as err:
            return Response({
                "success": False,
                "error": {"message": str(err)}
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Agent 4: Run deterministic hallucination validator
        validation_alerts = AIService.validate_hallucinations(
            profile_serialized,
            tailored_result.get('tailored_summary', ''),
            tailored_result.get('tailored_experiences', []),
            tailored_projects=tailored_result.get('tailored_projects', []),
            target_language=target_language
        )

        # Make JSON fields completely serializable by stringifying any nested UUID/datetime objects
        import json
        deep_analysis = tailored_result.get('deep_analysis') or ats_report.get('deep_analysis', {})
        details_safe = json.loads(json.dumps({
            "experiences": tailored_result.get('tailored_experiences', []),
            "skills": tailored_result.get('tailored_skills', profile_serialized.get('skills', [])),
            "projects": tailored_result.get('tailored_projects', profile_serialized.get('projects', [])),
            "educations": tailored_result.get('tailored_educations', []),
            "personal_info": tailored_result.get('tailored_personal_info', {}),
            "ats_report": ats_report,
            "deep_analysis": deep_analysis,
            "target_language": target_language,
            "original_profile": profile_serialized
        }, default=str))
        explanations_safe = json.loads(json.dumps(
            tailored_result.get('explanations', []),
            default=str
        ))

        save_version = request.data.get('save_version', True)

        # 5. Save or update the single resume version for this application
        if save_version:
            if not application:
                application = Application.objects.create(
                    user=user,
                    company=company,
                    position=position,
                    status='preparing',
                    job_description=job_description
                )

            resume_version, created = ResumeVersion.objects.update_or_create(
                user=user,
                application=application,
                defaults={
                    "title": f"Resume for {position} at {company}",
                    "target_company": company,
                    "target_role": position,
                    "ats_score": ats_report.get('score', 70),
                    "tailored_summary": tailored_result.get('tailored_summary', ''),
                    "tailored_details": details_safe,
                    "explanations": explanations_safe,
                    "validation_alerts": validation_alerts,
                    "template": template
                }
            )
            return Response({
                "success": True,
                "data": ResumeVersionSerializer(resume_version).data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
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
        target_language = request.data.get('target_language', 'en')
        letter_language = request.data.get('letter_language', 'auto')
        selected_project_ids = request.data.get('selected_project_ids', None)

        if not letter_language or letter_language == 'auto':
            resolved_lang = target_language or 'en'
        else:
            resolved_lang = letter_language

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
            "job_description": job_description,
            "keywords": []
        }
        if application:
            job_details["url"] = application.url or ""
            job_details["contact_name"] = application.contact_name or ""
            job_details["contact_email"] = application.contact_email or ""
            job_details["salary"] = application.salary or ""
            job_details["location"] = application.location or ""
            job_details["notes"] = application.notes or ""

        # Gather profile or use active tailored canvas details
        cv_details = request.data.get('cv_details', None)
        if cv_details and isinstance(cv_details, dict):
            profile_serialized = cv_details
        else:
            personal_info = PersonalInfo.objects.filter(user=user).first()
            projects_qs = Project.objects.filter(user=user)
            if selected_project_ids is not None and isinstance(selected_project_ids, list):
                projects_qs = projects_qs.filter(id__in=selected_project_ids)

            profile_data = {
                'personal_info': personal_info or PersonalInfo(user=user, full_name=user.full_name or "", email=user.email),
                'work_experiences': WorkExperience.objects.filter(user=user),
                'projects': projects_qs,
                'skills': Skill.objects.filter(user=user),
                'educations': Education.objects.filter(user=user),
                'certifications': Certification.objects.filter(user=user),
            }
            profile_serialized = FullProfileSerializer(profile_data).data

        # Call AI
        try:
            letter_content = AIService.write_cover_letter(profile_serialized, job_details, tone, length, api_key=api_key, target_language=resolved_lang)

            # Return generated letter content to frontend without saving to the database
            return Response({
                "success": True,
                "content": letter_content
            }, status=status.HTTP_200_OK)
        except ValueError as err:
            return Response({
                "success": False,
                "error": {"message": str(err)}
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

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
            
        # Gather lightweight candidate context to optimize tokens & latency
        personal_info = PersonalInfo.objects.filter(user=user).only('full_name', 'title').first()
        skills = Skill.objects.filter(user=user).values_list('name', flat=True)[:12]
        
        lightweight_context = {
            'candidate_name': personal_info.full_name if personal_info else user.full_name,
            'title': personal_info.title if personal_info else '',
            'top_skills': list(skills)
        }
        
        api_key = request.headers.get('X-Deepseek-Key', '').strip() or None
        try:
            rephrased = AIService.rephrase_block(text, instruction, lightweight_context, api_key=api_key)
            return Response({
                "success": True,
                "rephrased": rephrased
            })
        except ValueError as err:
            return Response({
                "success": False,
                "error": {"message": str(err)}
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class ATSScoreCheckView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        job_description = request.data.get('job_description', '')
        company = request.data.get('company', '')
        position = request.data.get('position', '')
        cv_details = request.data.get('cv_details', None)

        if not job_description or not cv_details:
            return Response({
                "success": False,
                "error": {"message": "Job description and CV details are required."}
            }, status=status.HTTP_400_BAD_REQUEST)

        api_key = request.headers.get('X-Deepseek-Key', '').strip() or None
        try:
            ats_report = AIService.analyze_ats(cv_details, job_description, api_key=api_key)

            return Response({
                "success": True,
                "ats_report": ats_report
            }, status=status.HTTP_200_OK)
        except ValueError as err:
            return Response({
                "success": False,
                "error": {"message": str(err)}
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

