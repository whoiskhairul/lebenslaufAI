import pyotp
from unittest import mock
from django.test import TestCase
from django.core.cache import cache
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from users.models import UserSession, AuthAuditLog

User = get_user_model()


class AuthSystemTests(TestCase):
    def setUp(self):
        # Throttle counters live in the shared cache, not the test
        # transaction: reset them so each test gets a fresh rate budget.
        cache.clear()
        self.client = APIClient()
        self.register_url = reverse('auth_register')
        self.login_url = reverse('auth_login')
        self.logout_url = reverse('auth_logout')
        self.password_reset_url = reverse('auth_password_reset')
        self.password_change_url = reverse('auth_password_change')
        self.two_factor_setup_url = reverse('security_2fa_setup')
        self.two_factor_verify_url = reverse('security_2fa_verify')

        self.user_data = {
            "email": "testuser@lebenslauf.ai",
            "password": "SecurePassword123!#",
            "full_name": "Test User"
        }

    def test_user_registration(self):
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email=self.user_data['email']).exists())
        user = User.objects.get(email=self.user_data['email'])
        self.assertIsNotNone(user.email_verification_token)

    def test_registration_weak_password_rejected(self):
        weak_data = {
            "email": "weak@lebenslauf.ai",
            "password": "123",
            "full_name": "Weak User"
        }
        response = self.client.post(self.register_url, weak_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def _verified_user(self, email=None, password=None):
        user = User.objects.create_user(
            username=email or self.user_data['email'],
            email=email or self.user_data['email'],
            password=password or self.user_data['password']
        )
        user.email_verified = True
        user.save(update_fields=['email_verified'])
        return user

    def test_login_success(self):
        user = self._verified_user()
        response = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(UserSession.objects.filter(user=user, is_active=True).exists())

    def test_login_unverified_blocked_with_resend(self):
        User.objects.create_user(
            username=self.user_data['email'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        response = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data.get('code'), 'email_not_verified')

    def test_brute_force_lockout_after_5_failed_attempts(self):
        user = User.objects.create_user(
            username=self.user_data['email'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        for _ in range(5):
            self.client.post(self.login_url, {
                "email": self.user_data['email'],
                "password": "WrongPassword123!"
            }, format='json')

        user.refresh_from_db()
        self.assertIsNotNone(user.account_locked_until)

        # Locked accounts are indistinguishable from bad credentials (401).
        response = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data.get('error'), "Invalid credentials.")

    def test_2fa_setup_and_verification(self):
        user = User.objects.create_user(
            username=self.user_data['email'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        self.client.force_authenticate(user=user)

        # Setup 2FA
        setup_res = self.client.get(self.two_factor_setup_url)
        self.assertEqual(setup_res.status_code, status.HTTP_200_OK)
        self.assertIn('qr_code', setup_res.data)

        # Generate TOTP code
        secret = setup_res.data['secret']
        totp = pyotp.TOTP(secret)
        code = totp.now()

        # Verify 2FA
        verify_res = self.client.post(self.two_factor_verify_url, {"code": code}, format='json')

        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertTrue(user.two_factor_enabled)

    def test_logout_and_jwt_blacklisting(self):
        user = self._verified_user()
        login_res = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')

        refresh_token = login_res.data['refresh']
        access_token = login_res.data['access']
        session_key = login_res.data['session_key']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_res = self.client.post(self.logout_url, {
            "refresh": refresh_token,
            "session_key": session_key
        }, format='json')
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Attempting refresh with blacklisted token should fail
        refresh_url = reverse('auth_refresh')
        ref_res = self.client.post(refresh_url, {"refresh": refresh_token}, format='json')
        self.assertEqual(ref_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_social_login_rejects_unverified_identity(self):
        social_url = reverse('auth_social_login')

        # No provider token at all — must be rejected, no account created.
        res = self.client.post(social_url, {
            "provider": "google",
            "email": "victim@lebenslauf.ai",
            "full_name": "Victim",
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="victim@lebenslauf.ai").exists())

        # Bogus provider token — must be rejected, no account created.
        res = self.client.post(social_url, {
            "provider": "google",
            "access_token": "bogus-token",
            "email": "victim@lebenslauf.ai",
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.filter(email="victim@lebenslauf.ai").exists())

    def test_revoked_session_invalidates_tokens(self):
        user = self._verified_user()
        login_res = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')
        access_token = login_res.data['access']
        refresh_token = login_res.data['refresh']
        session_key = login_res.data['session_key']

        # Sanity: bound tokens work while the session is active.
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        ok_res = self.client.get(reverse('account_profile'))
        self.assertEqual(ok_res.status_code, status.HTTP_200_OK)

        # Revoke the session (as logout / per-session revoke / reset does).
        UserSession.objects.filter(
            user=user, session_key=session_key).update(is_active=False)

        # Access token must now be rejected.
        denied_res = self.client.get(reverse('account_profile'))
        self.assertEqual(denied_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Refresh token must not mint new access tokens either.
        self.client.credentials()
        refresh_url = reverse('auth_refresh')
        ref_res = self.client.post(refresh_url, {"refresh": refresh_token}, format='json')
        self.assertEqual(ref_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_change_keeps_current_session(self):
        self._verified_user()
        first = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')
        other = APIClient()
        second = other.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {first.data['access']}")
        change_res = self.client.post(reverse('auth_password_change'), {
            "old_password": self.user_data['password'],
            "new_password": "BrandNewPass99!#"
        }, format='json')
        self.assertEqual(change_res.status_code, status.HTTP_200_OK)

        # Current session keeps working, including refresh rotation.
        me_res = self.client.get(reverse('account_profile'))
        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        ref_res = self.client.post(reverse('auth_refresh'), {"refresh": first.data['refresh']}, format='json')
        self.assertEqual(ref_res.status_code, status.HTTP_200_OK)

        # The other device is signed out.
        other_res = other.post(reverse('auth_refresh'), {"refresh": second.data['refresh']}, format='json')
        self.assertEqual(other_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_recovery_code_is_single_use(self):
        user = self._verified_user()
        user.two_factor_secret = pyotp.random_base32()
        user.two_factor_recovery_codes = ["abcd1234", "efgh5678"]
        user.two_factor_enabled = True
        user.save()

        # First use of the recovery code succeeds.
        first = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password'],
            "totp_code": "abcd1234",
        }, format='json')
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertIn('access', first.data)
        user.refresh_from_db()
        self.assertNotIn("abcd1234", user.two_factor_recovery_codes)

        # Reusing the same code fails.
        second = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password'],
            "totp_code": "abcd1234",
        }, format='json')
        self.assertEqual(second.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sendgrid_backend_posts_to_api(self):
        from django.core.mail import EmailMessage
        from users.sendgrid_backend import SendGridEmailBackend
        with mock.patch('users.sendgrid_backend.requests.Session') as mock_session_cls:
            session = mock_session_cls.return_value
            response = mock.Mock()
            response.status_code = 202
            response.raise_for_status.return_value = None
            session.post.return_value = response
            backend = SendGridEmailBackend(api_key='SG.test_key', fail_silently=False)
            message = EmailMessage(
                'Verify your account', 'Click the link',
                'Lebenslauf AI <noreply@lebenslauf.ai>', ['user@example.com'],
            )
            self.assertEqual(backend.send_messages([message]), 1)
            args, kwargs = session.post.call_args
            self.assertIn('api.sendgrid.com/v3/mail/send', args[0])
            payload = kwargs['json']
            self.assertEqual(payload['subject'], 'Verify your account')
            self.assertEqual(payload['from'], {'name': 'Lebenslauf AI', 'email': 'noreply@lebenslauf.ai'})
            self.assertEqual(payload['personalizations'][0]['to'], [{'email': 'user@example.com'}])
            self.assertEqual(payload['content'], [{'type': 'text/plain', 'value': 'Click the link'}])
            headers_arg = session.headers.update.call_args[0][0]
            self.assertEqual(headers_arg['Authorization'], 'Bearer SG.test_key')

    def test_sendgrid_backend_handles_failure(self):
        from django.core.mail import EmailMessage
        from users.sendgrid_backend import SendGridEmailBackend
        import requests as http_requests
        with mock.patch('users.sendgrid_backend.requests.Session') as mock_session_cls:
            session = mock_session_cls.return_value
            session.post.side_effect = http_requests.ConnectionError('down')
            message = EmailMessage('s', 'b', 'from@x.ai', ['to@y.ai'])
            quiet = SendGridEmailBackend(api_key='SG.test_key', fail_silently=True)
            self.assertEqual(quiet.send_messages([message]), 0)
            strict = SendGridEmailBackend(api_key='SG.test_key', fail_silently=False)
            with self.assertRaises(http_requests.ConnectionError):
                strict.send_messages([message])
            nokey = SendGridEmailBackend(api_key='', fail_silently=True)
            self.assertEqual(nokey.send_messages([message]), 0)

    def test_zz_login_throttled_after_burst(self):
        for i in range(11):
            response = self.client.post(self.login_url, {
                "email": f"ghost{i}@lebenslauf.ai",
                "password": "WrongPassword123!"
            }, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_resend_message_uniform(self):
        self._verified_user()
        resend_url = reverse('auth_resend_verification')
        known = self.client.post(resend_url, {"email": self.user_data['email']}, format='json')
        unknown = self.client.post(resend_url, {"email": "nobody@lebenslauf.ai"}, format='json')
        self.assertEqual(known.data.get('message'), unknown.data.get('message'))

    def test_social_login_merges_unverified_password_account(self):
        User.objects.create_user(
            username=self.user_data['email'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        social_url = reverse('auth_social_login')
        mock_resp = mock.Mock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "email": self.user_data['email'],
            "name": "Test User",
            "picture": "",
            "email_verified": True,
        }
        with mock.patch('users.views.requests.get', return_value=mock_resp):
            response = self.client.post(social_url, {
                "provider": "google",
                "access_token": "valid-provider-token",
            }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('password_reset_required'))
        user = User.objects.get(email=self.user_data['email'])
        self.assertTrue(user.email_verified)
        self.assertFalse(user.has_usable_password())
        self.assertFalse(user.check_password(self.user_data['password']))

    def test_social_login_rejects_unverified_provider_email(self):
        social_url = reverse('auth_social_login')
        mock_resp = mock.Mock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "email": self.user_data['email'],
            "name": "Test User",
            "picture": "",
            "email_verified": False,
        }
        with mock.patch('users.views.requests.get', return_value=mock_resp):
            response = self.client.post(social_url, {
                "provider": "google",
                "access_token": "valid-provider-token",
            }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.filter(email=self.user_data['email']).exists())
