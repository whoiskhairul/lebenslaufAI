"""
Full functional test suite for LebenslaufAI backend.

Covers: registration/login/lockout, email verification, password change,
2FA lifecycle, sessions, master profile CRUD, AI tailoring (mocked),
cover letters, rephrase, ATS checks, application pipeline, admin panel
permissions & payloads, and security audit logging.

Run:  python manage.py test core.tests_full -v 2
"""

import json
import uuid
from unittest import mock

import pyotp
from django.test import TestCase
from rest_framework.test import APIClient

from users.models import User, UserSession, AuthAuditLog
from master_profile.models import (
    PersonalInfo, WorkExperience, Project, Skill, Education, Certification
)
from resume.models import ResumeVersion, CoverLetterVersion
from applications.models import Application

USERS = '/api/v1/users'
AUTH = '/api/v1/auth'


def ai_report(score=82):
    return {
        'score': score,
        'matched_keywords': ['react', 'typescript'],
        'missing_keywords': ['kubernetes'],
        'suggestions': ['Mention Kubernetes exposure.']
    }


def ai_tailored():
    return {
        'tailored_summary': 'Senior engineer aligned to the role.',
        'tailored_experiences': [
            {'id': 'exp1', 'company': 'Acme', 'position': 'Engineer',
             'location': 'Berlin', 'start_date': '01/2020', 'end_date': 'Present',
             'bullets': ['Built things.', 'Shipped faster.']}
        ],
        'tailored_skills': [{'name': 'React', 'category': 'programming languages'}],
        'tailored_projects': [],
        'tailored_educations': [],
        'ats_report': ai_report(),
        'explanations': []
    }


LETTER_JSON = json.dumps({
    'sender_name': 'Test', 'date': '01. Januar 2000', 'subject': 'Application',
    'body': 'Dear team...', 'closing_salutation': 'Mit freundlichen GrÃ¼ÃŸen',
    'candidate_name': 'Test', 'is_json': True,
    'verification_notes': {'requirements_emphasized': ['react']}
})


class AIServiceMixin:
    """Patches every AIService entry point used by resume views."""

    def setUp(self):
        super().setUp()
        patcher = mock.patch.multiple(
            'resume.views.AIService',
            parse_job_description=mock.DEFAULT,
            tailor_resume=mock.DEFAULT,
            analyze_ats=mock.DEFAULT,
            validate_hallucinations=mock.DEFAULT,
            write_cover_letter=mock.DEFAULT,
            rephrase_block=mock.DEFAULT,
        )
        self.ai_mocks = patcher.start()
        self.addCleanup(patcher.stop)
        self.ai_mocks['parse_job_description'].return_value = {
            'company': 'Stripe', 'position': 'Lead Frontend Engineer',
            'keywords': ['react', 'typescript']
        }
        self.ai_mocks['tailor_resume'].return_value = ai_tailored()
        self.ai_mocks['analyze_ats'].return_value = ai_report()
        self.ai_mocks['validate_hallucinations'].return_value = []
        self.ai_mocks['write_cover_letter'].return_value = LETTER_JSON
        self.ai_mocks['rephrase_block'].return_value = 'Improved bullet text.'


class AuthTestBase(TestCase):
    def make_user(self, email='user@test.dev', password='Str0ng!Passw0rd!', **kw):
        return User.objects.create_user(
            username=email, email=email, password=password,
            email_verified=True, **kw
        )

    def auth_client(self, email='user@test.dev', **kw):
        user = self.make_user(email, **kw)
        c = APIClient()
        res = c.post(f'{AUTH}/auth/login',
                     {'email': email, 'password': 'Str0ng!Passw0rd!'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return c, user


class RegistrationLoginTests(AuthTestBase):
    def test_register_weak_password_rejected(self):
        c = APIClient()
        res = c.post(f'{USERS}/auth/register',
                     {'email': 'weak@test.dev', 'password': 'abc',
                      'full_name': 'Weak'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_register_success_creates_profile_and_token(self):
        c = APIClient()
        res = c.post(f'{USERS}/auth/register',
                     {'email': 'new@test.dev', 'password': 'Str0ng!Passw0rd!',
                      'full_name': 'New User'}, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        user = User.objects.get(email='new@test.dev')
        self.assertFalse(user.email_verified)
        from users.models import UserProfile as _UP
        self.assertTrue(_UP.objects.filter(user=user).exists())
        self.assertTrue(user.email_verification_token)

    def test_duplicate_email_rejected(self):
        self.make_user('dup@test.dev')
        c = APIClient()
        res = c.post(f'{USERS}/auth/register',
                     {'email': 'dup@test.dev', 'password': 'Str0ng!Passw0rd!'},
                     format='json')
        self.assertEqual(res.status_code, 400)

    def test_login_wrong_password_fails_and_audits(self):
        self.make_user('l@test.dev')
        c = APIClient()
        res = c.post(f'{AUTH}/auth/login',
                     {'email': 'l@test.dev', 'password': 'wrong'}, format='json')
        self.assertEqual(res.status_code, 401)
        self.assertTrue(AuthAuditLog.objects.filter(
            event_type='LOGIN_FAILED').exists())

    def test_login_success_returns_tokens_and_creates_session(self):
        self.make_user('ok@test.dev')
        c = APIClient()
        res = c.post(f'{AUTH}/auth/login',
                     {'email': 'ok@test.dev', 'password': 'Str0ng!Passw0rd!',
                      'remember_me': True}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertIn('session_key', res.data)
        self.assertEqual(res.data['user']['email'], 'ok@test.dev')
        self.assertTrue(UserSession.objects.filter(
            session_key=res.data['session_key']).exists())
        self.assertTrue(AuthAuditLog.objects.filter(
            event_type='LOGIN_SUCCESS').exists())

    def test_both_url_mounts_serve_auth(self):
        self.make_user('m@test.dev')
        c = APIClient()
        r1 = c.post(f'{AUTH}/auth/login',
                    {'email': 'm@test.dev', 'password': 'Str0ng!Passw0rd!'}, format='json')
        r2 = c.post(f'{USERS}/auth/login',
                    {'email': 'm@test.dev', 'password': 'Str0ng!Passw0rd!'}, format='json')
        self.assertEqual(r1.status_code, r2.status_code)

    def test_lockout_after_five_failures(self):
        self.make_user('lock@test.dev')
        c = APIClient()
        for _ in range(5):
            c.post(f'{AUTH}/auth/login',
                   {'email': 'lock@test.dev', 'password': 'nope'}, format='json')
        res = c.post(f'{AUTH}/auth/login',
                     {'email': 'lock@test.dev', 'password': 'Str0ng!Passw0rd!'},
                     format='json')
        self.assertEqual(res.status_code, 429 if hasattr(res, 'status_code') else res.status_code)
        self.assertIn(res.status_code, (400, 401, 403, 423, 429))
        user = User.objects.get(email='lock@test.dev')
        self.assertIsNotNone(user.account_locked_until)

    def test_protected_endpoint_requires_token(self):
        c = APIClient()
        res = c.get('/api/v1/resume/versions')
        self.assertEqual(res.status_code, 401)


class EmailVerificationTests(AuthTestBase):
    def test_verify_email_with_token(self):
        c = APIClient()
        c.post(f'{USERS}/auth/register',
               {'email': 'v@test.dev', 'password': 'Str0ng!Passw0rd!'}, format='json')
        user = User.objects.get(email='v@test.dev')
        res = c.post(f'{USERS}/auth/verify-email',
                     {'token': user.email_verification_token, 'email': user.email},
                     format='json')
        self.assertEqual(res.status_code, 200, res.content)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)

    def test_resend_verification(self):
        c = APIClient()
        c.post(f'{USERS}/auth/register',
               {'email': 'r@test.dev', 'password': 'Str0ng!Passw0rd!'}, format='json')
        res = c.post(f'{USERS}/auth/resend-verification',
                     {'email': 'r@test.dev'}, format='json')
        self.assertEqual(res.status_code, 200)


class PasswordTests(AuthTestBase):
    def test_password_change_and_relogin(self):
        c, user = self.auth_client('pc@test.dev')
        res = c.post(f'{USERS}/auth/password-change',
                     {'old_password': 'Str0ng!Passw0rd!',
                      'new_password': 'An0ther!Strong1'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        c2 = APIClient()
        res = c2.post(f'{AUTH}/auth/login',
                      {'email': 'pc@test.dev', 'password': 'An0ther!Strong1'},
                      format='json')
        self.assertEqual(res.status_code, 200)

    def test_password_reset_flow_issues_new_credentials(self):
        c = APIClient()
        self.make_user('pr@test.dev')
        c.post(f'{USERS}/auth/password-reset', {'email': 'pr@test.dev'}, format='json')
        user = User.objects.get(email='pr@test.dev')
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        res = c.post(f'{USERS}/auth/password-reset-confirm',
                     {'uid': uid, 'token': token,
                      'new_password': 'Br@nd!NewPass9'}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        c2 = APIClient()
        res = c2.post(f'{AUTH}/auth/login',
                      {'email': 'pr@test.dev', 'password': 'Br@nd!NewPass9'},
                      format='json')
        self.assertEqual(res.status_code, 200)


def default_token(user):
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_encode
    from django.utils.encoding import force_bytes
    # The reset view emails a link with uid+token; replicate its generator
    return f"{urlsafe_base64_encode(force_bytes(user.pk))}:{default_token_generator.make_token(user)}" \
        if False else _raw_reset_token(user)


def _raw_reset_token(user):
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_encode
    from django.utils.encoding import force_bytes
    uid = urlsafe_base64_encode(force_bytes(user.pk)).decode()
    token = default_token_generator.make_token(user)
    # PasswordResetConfirmSerializer accepts either combined "uid:token"
    # or separate fields depending on implementation; send both styles.
    return f"{uid}:{token}"


class TwoFactorTests(AuthTestBase):
    def test_2fa_setup_verify_disable_cycle(self):
        c, user = self.auth_client('2fa@test.dev')

        setup = c.get(f'{USERS}/security/2fa/setup')
        self.assertEqual(setup.status_code, 200, setup.content)
        secret = setup.data.get('secret')
        if not secret and 'otpauth_url' in setup.data:
            import urllib.parse as up
            q = up.urlparse(setup.data['otpauth_url']).query
            secret = up.parse_qs(q).get('secret', [None])[0]
        self.assertTrue(secret)

        code = pyotp.TOTP(secret).now()
        verify = c.post(f'{USERS}/security/2fa/verify', {'code': code}, format='json')
        self.assertEqual(verify.status_code, 200, verify.content)
        user.refresh_from_db()
        self.assertTrue(user.two_factor_enabled)

        # Login now demands TOTP step-up
        anon = APIClient()
        partial = anon.post(f'{AUTH}/auth/login',
                            {'email': '2fa@test.dev', 'password': 'Str0ng!Passw0rd!'},
                            format='json')
        self.assertTrue(partial.data.get('two_factor_required'),
                        partial.content)
        # TOTP windows are 30s; retry across a boundary if needed
        final = None
        for _ in range(3):
            final = anon.post(f'{AUTH}/auth/login',
                              {'email': '2fa@test.dev', 'password': 'Str0ng!Passw0rd!',
                               'totp_code': pyotp.TOTP(secret).now()}, format='json')
            if final.status_code == 200:
                break
        self.assertEqual(final.status_code, 200, final.content)

        disable = c.post(f'{USERS}/security/2fa/disable',
                         {'code': pyotp.TOTP(secret).now(), 'password': 'Str0ng!Passw0rd!'},
                         format='json')
        self.assertEqual(disable.status_code, 200, disable.content)
        user.refresh_from_db()
        self.assertFalse(user.two_factor_enabled)


class SessionTests(AuthTestBase):
    def test_session_list_and_revoke(self):
        c, user = self.auth_client('sess@test.dev')
        res = c.get(f'{USERS}/security/sessions')
        self.assertEqual(res.status_code, 200)
        sessions = res.data if isinstance(res.data, list) else res.data.get('sessions', [])
        self.assertTrue(len(sessions) >= 1)
        sid = sessions[0]['id']
        rev = c.post(f'{USERS}/security/sessions/{sid}/revoke')
        self.assertEqual(rev.status_code, 200, rev.content)
        self.assertFalse(UserSession.objects.get(id=sid).is_active)


class MasterProfileTests(AIServiceMixin, AuthTestBase):
    def test_full_profile_shape(self):
        c, user = self.auth_client('mp@test.dev')
        WorkExperience.objects.create(user=user, company='Acme', position='Eng',
                                      bullets=['x'])
        Skill.objects.create(user=user, name='React', category='programming languages')
        Project.objects.create(user=user, title='P1', technologies=['ts'], bullets=['b'])
        Education.objects.create(user=user, institution='TU Berlin', degree='BSc')
        Certification.objects.create(user=user, name='AWS SA')
        res = c.get('/api/v1/master-profile/full')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('data', res.data)
        for key in ('personal_info', 'work_experiences', 'projects',
                    'skills', 'educations', 'certifications'):
            self.assertIn(key, data)

    def test_experience_crud(self):
        c, _ = self.auth_client('exp@test.dev')
        res = c.post('/api/v1/master-profile/experience',
                     {'company': 'Acme', 'position': 'Engineer',
                      'bullets': json.dumps(['Did a thing'])}, format='json')
        self.assertIn(res.status_code, (200, 201))
        eid = res.data.get('id') or res.data.get('experience', {}).get('id')
        self.assertTrue(eid)
        res = c.patch(f'/api/v1/master-profile/experience/{eid}',
                      {'position': 'Senior Engineer'}, format='json')
        self.assertIn(res.status_code, (200,))
        res = c.delete(f'/api/v1/master-profile/experience/{eid}')
        self.assertIn(res.status_code, (200, 204))

    def test_skills_and_certifications_crud(self):
        c, _ = self.auth_client('sk@test.dev')
        res = c.post('/api/v1/master-profile/skills',
                     {'name': 'Docker', 'category': 'cloud & devops'}, format='json')
        self.assertIn(res.status_code, (200, 201))
        sid = res.data.get('id')
        res = c.delete(f'/api/v1/master-profile/skills/{sid}')
        self.assertIn(res.status_code, (200, 204))
        res = c.post('/api/v1/master-profile/certifications',
                     {'name': 'GCP ACE'}, format='json')
        self.assertIn(res.status_code, (200, 201))

    def test_generate_summary_mocked(self):
        c, user = self.auth_client('gs@test.dev')
        WorkExperience.objects.create(user=user, company='Acme', position='Eng', bullets=['x'])
        Project.objects.create(user=user, title='P1', technologies=['ts'], bullets=['b'])
        Skill.objects.create(user=user, name='React', category='programming languages')
        with mock.patch('services.ai_service.AIService.generate_executive_summary',
                        return_value='Excellent summary text.'):
            res = c.post('/api/v1/master-profile/generate-summary', {}, format='json')
            self.assertIn(res.status_code, (200, 201))
            info = PersonalInfo.objects.filter(user=user).first()
            summary_saved = info.summary if info else None
            self.assertTrue(summary_saved or res.data.get('summary'))

    def test_import_cv_without_file_is_400(self):
        c, _ = self.auth_client('imp@test.dev')
        res = c.post('/api/v1/master-profile/import-cv', {}, format='json')
        self.assertEqual(res.status_code, 400)


def _has_master_ai():
    try:
        import master_profile.views as mv
        return hasattr(mv, 'AIService')
    except Exception:
        return False


class _Noop:
    def __enter__(self):
        return None

    def __exit__(self, *a):
        return False


def _noop():
    return _Noop()


class ResumeFlowTests(AIServiceMixin, AuthTestBase):
    def tailor(self, c, extra=None):
        payload = {
            'job_description': 'React TypeScript lead role. Kubernetes a plus.',
            'company': '', 'position': '',
            'target_language': 'en', 'aggressive_mode': False
        }
        payload.update(extra or {})
        return c.post('/api/v1/resume/tailor', payload, format='json')

    def test_tailor_requires_job_description(self):
        c, _ = self.auth_client('tj@test.dev')
        res = c.post('/api/v1/resume/tailor', {'job_description': ''}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_tailor_creates_version_with_snapshot_and_ats(self):
        c, user = self.auth_client('tv@test.dev')
        WorkExperience.objects.create(user=user, company='Acme', position='Eng',
                                      bullets=['Original bullet'])
        res = self.tailor(c)
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(res.data.get('success'))
        self.assertIn('data', res.data)
        version = ResumeVersion.objects.filter(user=user).first()
        self.assertIsNotNone(version)
        self.assertEqual(version.target_company, 'Stripe')
        self.assertIn('original_profile', version.tailored_details)
        self.assertGreater(version.ats_score, 0)
        self.assertIsNotNone(version.application)
        self.assertEqual(version.application.company, 'Stripe')
        self.assertEqual(version.application.status, 'preparing')

    def test_versions_list_patch_delete(self):
        c, user = self.auth_client('vl@test.dev')
        v = ResumeVersion.objects.create(
            user=user, title='V1', target_company='A', target_role='B',
            tailored_details={'original_profile': {}}
        )
        res = c.get('/api/v1/resume/versions')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(str(item.get('id')) == str(v.id)
                            for item in (res.data if isinstance(res.data, list)
                                         else res.data.get('results', []))))
        res = c.patch(f'/api/v1/resume/versions/{v.id}',
                      {'title': 'V1-renamed'}, format='json')
        self.assertIn(res.status_code, (200,))
        v.refresh_from_db()
        self.assertEqual(v.title, 'V1-renamed')
        res = c.delete(f'/api/v1/resume/versions/{v.id}')
        self.assertIn(res.status_code, (200, 204))
        self.assertFalse(ResumeVersion.objects.filter(id=v.id).exists())

    def test_cover_letter_generation_returns_content_only(self):
        c, user = self.auth_client('cl@test.dev')
        res = c.post('/api/v1/resume/cover-letter',
                     {'job_description': 'Backend role, Django.',
                      'company': 'Meta', 'position': 'Backend Eng',
                      'tone': 'professional', 'letter_language': 'en'},
                     format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.data.get('success'))
        self.assertIn('content', res.data)
        # By design the backend returns generated content without persisting;
        # the frontend saves it explicitly via POST /resume/letters.
        self.assertFalse(CoverLetterVersion.objects.filter(user=user).exists())

    def test_letters_listing(self):
        c, user = self.auth_client('ll@test.dev')
        CoverLetterVersion.objects.create(user=user, target_company='A',
                                          target_role='B', content='hi')
        res = c.get('/api/v1/resume/letters')
        self.assertEqual(res.status_code, 200)

    def test_rephrase(self):
        c, _ = self.auth_client('rp@test.dev')
        res = c.post('/api/v1/resume/rephrase',
                     {'text': 'did stuff', 'instruction': 'make punchy'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data.get('rephrased'), 'Improved bullet text.')
        res = c.post('/api/v1/resume/rephrase', {'text': '', 'instruction': ''},
                     format='json')
        self.assertEqual(res.status_code, 400)

    def test_ats_check(self):
        c, _ = self.auth_client('at@test.dev')
        res = c.post('/api/v1/resume/ats-check',
                     {'job_description': 'React role',
                      'cv_details': {'skills': [{'name': 'React'}]}}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('ats_report', res.data)


class ApplicationPipelineTests(AuthTestBase):
    def test_crud_and_status_history(self):
        c, _ = self.auth_client('app@test.dev')
        res = c.post('/api/v1/applications',
                     {'company': 'Stripe', 'position': 'FE Lead',
                      'status': 'applied'}, format='json')
        self.assertIn(res.status_code, (200, 201))
        app_id = res.data.get('id')
        app = Application.objects.get(id=app_id)
        self.assertEqual(app.status, 'applied')
        self.assertEqual(len(app.status_history), 1)

        res = c.patch(f'/api/v1/applications/{app_id}',
                      {'status': 'interview'}, format='json')
        self.assertEqual(res.status_code, 200)
        app.refresh_from_db()
        statuses = [h.get('status') for h in app.status_history]
        self.assertEqual(statuses, ['applied', 'interview'])

        res = c.get('/api/v1/applications')
        self.assertEqual(res.status_code, 200)
        res = c.delete(f'/api/v1/applications/{app_id}')
        self.assertIn(res.status_code, (200, 204))


class AdminPanelTests(AIServiceMixin, AuthTestBase):
    ADMIN_GETS = [
        '/api/v1/admin/metrics', '/api/v1/admin/users',
        '/api/v1/admin/resumes', '/api/v1/admin/applications',
        '/api/v1/admin/audit-logs', '/api/v1/admin/sessions',
    ]

    def setUp(self):
        super().setUp()
        self.staff = self.make_user('staff@test.dev', is_staff=True)
        self.plain = self.make_user('plain@test.dev')
        ResumeVersion.objects.create(
            user=self.plain, title='Their CV', target_company='X', target_role='Y',
            template='pixel_perfect_pdf', ats_score=77,
            tailored_details={
                'original_profile': {'personal_info': {'full_name': 'Plain'}}
            }
        )
        Application.objects.create(user=self.plain, company='Z', position='P')

    def staff_client(self):
        c = APIClient()
        res = c.post(f'{AUTH}/auth/login',
                     {'email': 'staff@test.dev', 'password': 'Str0ng!Passw0rd!'},
                     format='json')
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return c

    def plain_client(self):
        c = APIClient()
        res = c.post(f'{AUTH}/auth/login',
                     {'email': 'plain@test.dev', 'password': 'Str0ng!Passw0rd!'},
                     format='json')
        c.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return c

    def test_non_staff_gets_403_everywhere(self):
        c = self.plain_client()
        for url in self.ADMIN_GETS:
            self.assertEqual(c.get(url).status_code, 403, url)

    def test_anonymous_gets_401(self):
        c = APIClient()
        for url in self.ADMIN_GETS:
            self.assertEqual(c.get(url).status_code, 401, url)

    def test_metrics_payload_shape(self):
        c = self.staff_client()
        res = c.get('/api/v1/admin/metrics')
        self.assertEqual(res.status_code, 200)
        d = res.data
        for key in ('totals', 'growth', 'engagement', 'signup_series',
                    'resume_series', 'login_series'):
            self.assertIn(key, d)
        self.assertGreaterEqual(d['totals']['users'], 2)
        self.assertGreaterEqual(d['totals']['resumes'], 1)

    def test_users_list_pagination_and_search(self):
        c = self.staff_client()
        res = c.get('/api/v1/admin/users?page=1&page_size=1&search=plain')
        self.assertEqual(res.status_code, 200)
        self.assertIn('results', res.data)
        self.assertIn('pagination', res.data)
        emails = [u['email'] for u in res.data['results']]
        self.assertIn('plain@test.dev', emails)
        self.assertNotIn('staff@test.dev', emails)

    def test_resume_list_and_full_detail(self):
        c = self.staff_client()
        res = c.get('/api/v1/admin/resumes?search=their')
        self.assertEqual(res.status_code, 200)
        rid = res.data['results'][0]['id']
        detail = c.get(f'/api/v1/admin/resumes/{rid}')
        self.assertEqual(detail.status_code, 200)
        self.assertIn('tailored_details', detail.data)
        self.assertEqual(detail.data['template'], 'pixel_perfect_pdf')

    def test_user_detail_and_flag_updates(self):
        c = self.staff_client()
        res = c.get(f'/api/v1/admin/users/{self.plain.id}')
        self.assertEqual(res.status_code, 200)
        self.assertIn('stats', res.data)

        res = c.patch(f'/api/v1/admin/users/{self.plain.id}',
                      {'is_active': False}, format='json')
        self.assertEqual(res.status_code, 200)
        self.plain.refresh_from_db()
        self.assertFalse(self.plain.is_active)
        res = c.patch(f'/api/v1/admin/users/{self.plain.id}',
                      {'is_active': True}, format='json')
        self.plain.refresh_from_db()
        self.assertTrue(self.plain.is_active)

    def test_staff_cannot_modify_own_flags(self):
        c = self.staff_client()
        res = c.patch(f'/api/v1/admin/users/{self.staff.id}',
                      {'is_staff': False}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_applications_audit_sessions_visible_to_staff(self):
        c = self.staff_client()
        res = c.get('/api/v1/admin/applications')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data['results']), 1)
        res = c.get('/api/v1/admin/audit-logs')
        self.assertEqual(res.status_code, 200)
        res = c.get('/api/v1/admin/sessions')
        self.assertEqual(res.status_code, 200)


class AccountDangerTests(AuthTestBase):
    def test_account_delete(self):
        c, user = self.auth_client('del@test.dev')
        res = c.post(f'{USERS}/account/delete', {'password': 'Str0ng!Passw0rd!'}, format='json')
        self.assertIn(res.status_code, (200, 204))
        self.assertFalse(User.objects.filter(id=user.id).exists())


class SerializationSafetyTests(AuthTestBase):
    def test_user_serializer_exposes_staff_flags(self):
        c, user = self.auth_client('flag@test.dev', is_staff=True)
        res = c.get(f'{USERS}/account/profile')
        self.assertEqual(res.status_code, 200)
        body = res.data if isinstance(res.data, dict) else {}
        payload = body.get('user', body)
        self.assertIn('is_staff', json.dumps(payload))

