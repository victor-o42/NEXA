import os
import logging
from typing import Dict, Any
from django.conf import settings
import resend

logger = logging.getLogger(__name__)

def send_welcome_email(user_email: str, first_name: str = "there") -> bool:
    """
    Sends a personalized welcome email via Resend API after user's first login
    (works for both manual signup confirmation and Google OAuth users).
    """
    api_key = getattr(settings, 'RESEND_API_KEY', os.getenv('RESEND_API_KEY'))
    if not api_key:
        logger.warning("RESEND_API_KEY is not configured. Skipping welcome email delivery.")
        return False

    resend.api_key = api_key

    # Safe fallback name formatting
    display_name = first_name.strip().capitalize() if first_name else "there"

    # Load HTML template
    template_path = os.path.join(os.path.dirname(__file__), 'emails', 'welcome_onboarding.html')
    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        html_content = html_content.replace('{{ first_name }}', display_name)
    except Exception as e:
        logger.error(f"Failed to load welcome email template: {e}")
        return False

    from_address = os.getenv('RESEND_WELCOME_FROM', 'NEXA Security <welcome@mail.nexa-scan.click>')

    try:
        params: Dict[str, Any] = {
            "from": from_address,
            "to": [user_email],
            "subject": f"Welcome to NEXA, {display_name}! 🛡️ Your Security Terminal is Ready",
            "html": html_content,
        }
        email_res = resend.Emails.send(params)  # type: ignore
        
        # Safely extract email ID regardless of dictionary or object return type
        email_id = email_res.get('id') if isinstance(email_res, dict) else getattr(email_res, 'id', str(email_res))
        logger.info(f"Welcome email successfully sent to {user_email}. Resend ID: {email_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user_email} via Resend: {e}")
        return False
