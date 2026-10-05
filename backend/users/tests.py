import pyotp
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

        # Attempt login after lockout
        response = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

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

    def test_password_change_blacklists_old_tokens(self):
        self._verified_user()
        login_res = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')
        refresh_token = login_res.data['refresh']
        access_token = login_res.data['access']

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        change_res = self.client.post(reverse('auth_password_change'), {
            "old_password": self.user_data['password'],
            "new_password": "BrandNewPass99!#"
        }, format='json')
        self.assertEqual(change_res.status_code, status.HTTP_200_OK)

        refresh_url = reverse('auth_refresh')
        ref_res = self.client.post(refresh_url, {"refresh": refresh_token}, format='json')
        self.assertEqual(ref_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_recovery_code_single_use(self):
        user = self._verified_user()
        self.client.force_authenticate(user=user)
        setup_res = self.client.get(self.two_factor_setup_url)
        codes = list(setup_res.data['recovery_codes'])
        self.assertTrue(len(codes) >= 1)

        # Enable 2FA first via TOTP so login requires the second factor
        secret = setup_res.data['secret']
        verify_res = self.client.post(
            self.two_factor_verify_url, {"code": pyotp.TOTP(secret).now()}, format='json'
        )
        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)

        anon = APIClient()
        first = anon.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password'],
            "totp_code": codes[0]
        }, format='json')
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        self.assertNotIn(codes[0], list(user.two_factor_recovery_codes or []))

        second = anon.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password'],
            "totp_code": codes[0]
        }, format='json')
        self.assertEqual(second.status_code, status.HTTP_401_UNAUTHORIZED)

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

    def test_social_login_blocked_for_unverified_password_account(self):
        User.objects.create_user(
            username=self.user_data['email'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
        social_url = reverse('auth_social_login')
        response = self.client.post(social_url, {
            "provider": "google",
            "email": self.user_data['email']
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data.get('code'), 'account_exists')
