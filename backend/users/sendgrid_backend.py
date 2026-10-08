"""SendGrid email backend (v3 Web API, no extra dependency).

Sends Django EmailMessage objects through
https://api.sendgrid.com/v3/mail/send using the ``SENDGRID_API_KEY``
setting. Selected automatically in settings when the key is present.
Plain-text bodies go to ``content`` as ``text/plain``; a ``text/html``
alternative is forwarded as ``text/html`` when present.
"""
import logging
from email.utils import parseaddr

import requests
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import sanitize_address


def _sendgrid_address(raw, encoding='utf-8'):
    """Split 'Name <addr>' into SendGrid's {name, email} shape."""
    name, addr = parseaddr(sanitize_address(raw, encoding))
    address = {'email': addr}
    if name:
        address['name'] = name
    return address

logger = logging.getLogger(__name__)

SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'


class SendGridEmailBackend(BaseEmailBackend):
    def __init__(self, *args, api_key=None, api_url=None, **kwargs):
        super().__init__(*args, **kwargs)
        if api_key is None:
            from django.conf import settings as dj_settings
            api_key = getattr(dj_settings, 'SENDGRID_API_KEY', '')
        self.api_key = api_key
        self.api_url = api_url or SENDGRID_API_URL

    def _personalization(self, message, encoding):
        personalization = {
            'to': [_sendgrid_address(addr, encoding) for addr in message.to],
        }
        if message.cc:
            personalization['cc'] = [_sendgrid_address(addr, encoding) for addr in message.cc]
        if message.bcc:
            personalization['bcc'] = [_sendgrid_address(addr, encoding) for addr in message.bcc]
        return personalization

    def _payload(self, message):
        encoding = message.encoding or 'utf-8'
        payload = {
            'personalizations': [self._personalization(message, encoding)],
            'from': _sendgrid_address(message.from_email, encoding),
            'subject': message.subject,
            'content': [{'type': 'text/plain', 'value': message.body or ''}],
        }
        if message.reply_to:
            payload['reply_to'] = _sendgrid_address(message.reply_to[0], encoding)
        for content, mimetype in getattr(message, 'alternatives', []) or []:
            if mimetype == 'text/html':
                payload['content'].append({'type': 'text/html', 'value': content})
                break
        return payload

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        if not self.api_key:
            if not self.fail_silently:
                raise ValueError('SENDGRID_API_KEY is not configured.')
            logger.warning('SendGrid backend has no API key; dropping %d message(s).', len(email_messages))
            return 0
        session = requests.Session()
        session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        })
        sent = 0
        for message in email_messages:
            try:
                response = session.post(self.api_url, json=self._payload(message), timeout=10)
                response.raise_for_status()
                sent += 1
            except Exception as exc:
                detail = ''
                response = getattr(exc, 'response', None)
                if response is not None:
                    try:
                        detail = f' [{response.status_code} {response.text[:300]}]'
                    except Exception:
                        detail = ''
                logger.error('SendGrid API send failed for %s%s.', message.to, detail)
                if not self.fail_silently:
                    raise
        return sent
