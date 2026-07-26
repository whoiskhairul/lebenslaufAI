from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from services.ai_service import AIService

class ATSScoreView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        job_description = request.data.get('job_description', '')
        cv_details = request.data.get('cv_details', None)
        api_key = request.headers.get('X-Deepseek-Key', '').strip() or None

        if not job_description or cv_details is None:
            return Response({
                "success": False,
                "error": {"message": "Both job_description and cv_details are required."}
            }, status=status.HTTP_400_BAD_REQUEST)

        report = AIService.analyze_ats(cv_details, job_description, api_key=api_key)

        return Response({
            "success": True,
            "ats_report": report
        }, status=status.HTTP_200_OK)


class ATSOptimizeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        job_description = request.data.get('job_description', '')
        cv_details = request.data.get('cv_details', {})
        api_key = request.headers.get('X-Deepseek-Key', '').strip() or None

        if not job_description or not cv_details:
            return Response({
                "success": False,
                "error": {"message": "Job description and CV details are required for structural optimization."}
            }, status=status.HTTP_400_BAD_REQUEST)

        report = AIService.analyze_ats(cv_details, job_description, api_key=api_key)
        missing_kw = report.get("missing_keywords", [])

        proposals = []
        if isinstance(missing_kw, list) and len(missing_kw) > 0:
            proposals.append({
                "id": "inject_missing_skills",
                "type": "add_skills",
                "title": f"Add {len(missing_kw[:5])} Missing Technical Skills",
                "description": f"Inject keywords directly matching the target position: {', '.join(missing_kw[:5])}.",
                "action": "add_skills",
                "skills_to_add": missing_kw[:5]
            })

        return Response({
            "success": True,
            "ats_report": report,
            "proposals": proposals
        }, status=status.HTTP_200_OK)


class ATSRulesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            "success": True,
            "rules": {"hard_skills_weight": 0.45, "structure_weight": 0.25, "bullets_weight": 0.30}
        }, status=status.HTTP_200_OK)

    def put(self, request):
        new_rules = request.data.get('rules', {})
        return Response({
            "success": True,
            "rules": new_rules
        }, status=status.HTTP_200_OK)
