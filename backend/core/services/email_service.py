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

def send_broadcast_email(recipients: list[str], title: str, message: str, announcement_type: str = "general") -> int:
    """
    Sends a branded broadcast email to all specified recipients via Resend.
    Returns the count of successfully queued/sent emails.
    """
    if not recipients:
        return 0

    api_key = getattr(settings, 'RESEND_API_KEY', os.getenv('RESEND_API_KEY'))
    if not api_key:
        logger.warning("RESEND_API_KEY is not configured. Skipping broadcast email delivery.")
        return 0

    resend.api_key = api_key
    from_address = os.getenv('RESEND_BROADCAST_FROM', 'NEXA Platform <updates@mail.nexa-scan.click>')

    # Type badge styling
    type_meta = {
        'feature': {'label': '✨ New Feature Release', 'color': '#00F2FE', 'accent': 'rgba(0,242,254,0.15)'},
        'maintenance': {'label': '⚙️ System Maintenance Notice', 'color': '#FFB800', 'accent': 'rgba(255,184,0,0.15)'},
        'alert': {'label': '🛡️ Security Advisory', 'color': '#FF4D4D', 'accent': 'rgba(255,77,77,0.15)'},
        'general': {'label': '📢 Official Platform Update', 'color': '#9B5DE5', 'accent': 'rgba(155,93,229,0.15)'},
    }.get(announcement_type, {'label': '📢 Platform Announcement', 'color': '#00F2FE', 'accent': 'rgba(0,242,254,0.15)'})

    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #07090E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #07090E; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600" style="max-width: 600px; background-color: #0E121B; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
              
              <!-- Header Bar -->
              <tr>
                <td style="padding: 28px 32px; background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%); border-bottom: 1px solid rgba(255,255,255,0.06);">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="left">
                        <span style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #FFFFFF;">
                          NEXA<span style="color: #00F2FE;">.</span>
                        </span>
                      </td>
                      <td align="right">
                        <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: {type_meta['color']}; background: {type_meta['accent']}; border: 1px solid {type_meta['color']}33; border-radius: 20px;">
                          {type_meta['label']}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px;">
                  <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                    {title}
                  </h1>
                  <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #94A3B8; white-space: pre-wrap;">
{message}
                  </p>

                  <table border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
                    <tr>
                      <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%);">
                        <a href="https://nexa-scan.click/dashboard/scanner" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 700; color: #07090E; text-decoration: none; border-radius: 10px;">
                          Open NEXA Terminal &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background-color: #090C14; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #64748B;">
                    You are receiving this official update because you have an active account on NEXA Security.
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #475569;">
                    &copy; 2026 NEXA Cyber Intelligence. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    success_count = 0
    # Batch into chunks of 50 to respect Resend single batch limits
    batch_size = 50
    for i in range(0, len(recipients), batch_size):
        chunk = recipients[i:i + batch_size]
        try:
            batch_params = [
                {
                    "from": from_address,
                    "to": [email],
                    "subject": f"[{type_meta['label'].split(' ')[0]}] {title}",
                    "html": html_template
                }
                for email in chunk
            ]
            resend.Batch.send(batch_params)  # type: ignore
            success_count += len(chunk)
            logger.info(f"Broadcast email batch of {len(chunk)} sent successfully.")
        except Exception as e:
            logger.error(f"Failed to send broadcast batch: {e}")
            # Fallback: single sends if batch fails
            for email in chunk:
                try:
                    resend.Emails.send({
                        "from": from_address,
                        "to": [email],
                        "subject": f"[{type_meta['label'].split(' ')[0]}] {title}",
                        "html": html_template
                    })  # type: ignore
                    success_count += 1
                except Exception as single_err:
                    logger.error(f"Failed single broadcast send to {email}: {single_err}")

    return success_count

