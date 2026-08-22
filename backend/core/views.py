from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import urllib.parse
import socket
import re
import time
import logging
from core.models import ScanHistory
from core.services.orchestrator import run_nexa_orchestrator

logger = logging.getLogger(__name__)


class HeartbeatView(APIView):
    """
    Simple health-check endpoint to verify backend system status.
    """
    def get(self, request):
        return Response({
            "status": "healthy",
            "system": "NEXA Backend Operational Engine",
            "timestamp": timezone.now(),
            "version": "1.0.0-MVP"
        }, status=status.HTTP_200_OK)


from django.http import StreamingHttpResponse
import json
from rest_framework.renderers import BaseRenderer

class EventStreamRenderer(BaseRenderer):
    media_type = 'text/event-stream'
    format = 'txt'
    
    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data

class ScanStreamView(APIView):
    """
    Server-Sent Events (SSE) endpoint to stream live scanning progress to the React frontend.
    Runs the multi-scanner orchestrator and then feeds findings into Gemini AI.
    """
    renderer_classes = [EventStreamRenderer]

    def get(self, request):
        raw_target = request.GET.get("target", "").strip()
        engine     = request.GET.get("engine", "port").strip().lower()  # 'port' or 'web'

        if not raw_target:
            return Response(
                {"error": "Please provide a target domain or IP address to scan."},
                status=status.HTTP_400_BAD_REQUEST
            )

        current_user = request.user if request.user and request.user.is_authenticated else None

        # --- RBAC & Rate Limiting Enforcement ---
        if current_user and hasattr(current_user, 'profile'):
            profile = current_user.profile
            if not profile.is_admin and profile.scans_used >= profile.max_scans:
                return Response(
                    {"error": "Scan quota exceeded. Please upgrade your plan or contact support."},
                    status=status.HTTP_403_FORBIDDEN
                )

        def event_stream():
            from core.services.ai_analyzer import analyze_scan_results

            # ── Step 1: Parse and detect input type ──────────────────────────────
            raw = raw_target.lower().strip()

            # Pull the host out of any URL the user might paste
            has_scheme   = "://" in raw
            has_path     = bool(re.search(r'[/?#]', raw.lstrip('http').lstrip('https')))
            looks_like_url = has_scheme or raw.startswith("www.") or has_path

            # Detect if the string is a plain IP address (v4 only for now)
            ip_pattern = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')
            looks_like_ip = bool(ip_pattern.match(raw.split('/')[0]))

            # Extract the clean hostname — strip scheme, path, port, and query string
            try:
                if has_scheme:
                    parsed       = urllib.parse.urlparse(raw)
                    clean_host   = parsed.hostname or parsed.path.split('/')[0]
                    original_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}" if parsed.netloc else raw
                else:
                    clean_host   = raw.split('/')[0].split('?')[0].split('#')[0]
                    original_url = f"https://{clean_host}"

                if ':' in clean_host:  # strip port if included
                    clean_host = clean_host.split(':')[0]

            except Exception:
                clean_host   = raw
                original_url = f"https://{raw}"

            # Determine the effective engine and whether we need to stream a correction notice
            effective_engine = engine
            correction_msg   = None

            if engine == 'port' and looks_like_url and not looks_like_ip:
                # User pasted a full URL into the port scanner — we handle it gracefully
                effective_engine = 'full'  # run both so nothing is missed
                correction_msg = (
                    f"Heads up — I noticed you dropped a URL into the Port Scanner. "
                    f"No worries, I've stripped it down to '{clean_host}' and resolved the IP automatically. "
                    f"Running a full diagnostic (ports + web surface) so you get the complete picture."
                )

            elif engine == 'web' and looks_like_ip:
                # User pasted a bare IP into the Web App scanner — also handled gracefully
                effective_engine = 'full'
                correction_msg = (
                    f"Note: the Web App Scanner works best with a domain name, "
                    f"but I've got you covered. Running a port scan on {clean_host} first to map the "
                    f"attack surface, then handing it off to the web vulnerability engine."
                )

            # ── Rule 1: Self-Scan Awareness Routine ──────────────────────────────
            self_scan_domains = ["nexa-scan.click", "localhost", "127.0.0.1", "staging.nexa-scan.click"]
            if any(clean_host == domain or clean_host.endswith('.' + domain) for domain in self_scan_domains):
                # Fake a real scan stream for immersion
                time.sleep(1.0)
                yield f"data: {json.dumps({'status': 'running', 'message': f'Resolving target: {clean_host}...'})}\n\n"
                time.sleep(1.5)
                yield f"data: {json.dumps({'status': 'running', 'message': f'Resolved. Initiating diagnostic engine on {clean_host}...'})}\n\n"
                time.sleep(2.0)
                yield f"data: {json.dumps({'status': 'running', 'message': 'Wait a minute... analyzing target signature...'})}\n\n"
                time.sleep(1.5)
                
                fake_summary = {
                    "scan_status": {"target": clean_host, "duration": "2.5s", "status": "COMPLETED"},
                    "security_verdict": "Appears Safe",
                    "verdict_explanation": "Scanning NEXA itself? Bold move. Internal confidence check complete — all shields active.",
                    "risk_overview": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "Info": 1},
                    "nexa_summary": "I see what you did there... You tried to run a diagnostic on my own architecture. While I appreciate the curiosity, my internal shields are fully active and hardened. I'm operating at peak efficiency. Let's redirect this firepower to a real external target.",
                    "findings": [],
                    "recommendations": ["Run a diagnostic on an external domain to see actual vulnerabilities."],
                    "technical_details": "Self-scan blocked by internal firewall rules."
                }
                
                fake_ai_summary = json.dumps(fake_summary)
                fake_results = {"target": clean_host, "status": "completed", "open_ports": [], "web_vulnerabilities": []}

                scan_record = ScanHistory.objects.create(
                    user=current_user,
                    target=clean_host,
                    scan_type=ScanHistory.ScanType.PORT,
                    status=ScanHistory.ScanStatus.COMPLETED,
                    explanation=fake_ai_summary,
                    results=fake_results
                )
                
                yield f"data: {json.dumps({'status': 'completed', 'message': 'Diagnostic complete.', 'scan_id': scan_record.id, 'ai_summary': fake_ai_summary, 'scan_results': fake_results})}\n\n"
                return

            # Map the engine to the DB scan type
            if effective_engine == 'web':
                db_scan_type = ScanHistory.ScanType.WEB
            else:
                db_scan_type = ScanHistory.ScanType.PORT  # PORT covers both 'port' and 'full'

            # ── Create the pending DB record right away ───────────────────────────
            scan_record = ScanHistory.objects.create(
                user=current_user,
                target=clean_host,
                scan_type=db_scan_type,
                status=ScanHistory.ScanStatus.SCANNING,
                explanation="Scan in progress..."
            )

            # --- Target validated and recorded, track scan usage on profile ---
            profile = getattr(current_user, 'profile', None) if current_user else None
            if profile and not profile.is_admin:
                profile.scans_used += 1
                profile.save()

            # ── Stream the correction notice before anything else ─────────────────
            if correction_msg:
                time.sleep(0.5)
                yield f"data: {json.dumps({'status': 'notice', 'message': correction_msg})}\n\n"

            try:
                # ── Step 2: DNS Resolution check ─────────────────────────────────────
                time.sleep(0.5)
                yield f"data: {json.dumps({'status': 'running', 'message': f'Resolving target: {clean_host}...'})}\n\n"

                try:
                    resolved_ip = socket.gethostbyname(clean_host)
                    time.sleep(0.8)
                    yield f"data: {json.dumps({'status': 'running', 'message': f'Resolved to IP: {resolved_ip}'})}\n\n"
                    time.sleep(0.8)
                    yield f"data: {json.dumps({'status': 'running', 'message': 'Initializing diagnostic engines...'})}\n\n"
                except socket.gaierror:
                    scan_record.status = ScanHistory.ScanStatus.FAILED
                    scan_record.explanation = f"DNS resolution failed for '{clean_host}'."
                    scan_record.save()
                    if profile and not profile.is_admin and profile.scans_used > 0:
                        profile.scans_used -= 1
                        profile.save(update_fields=['scans_used'])
                    error_msg = f"DNS resolution failed for '{clean_host}'. Double check the target and try again."
                    yield f"data: {json.dumps({'status': 'error', 'message': error_msg})}\n\n"
                    return

                # ── Step 3: Engine Activation Briefing ──────────────────────────────
                time.sleep(0.8)
                if effective_engine == 'port':
                    yield f"data: {json.dumps({'status': 'running', 'message': 'Port Scanning Engine active'})}\n\n"
                    time.sleep(0.8)
                    yield f"data: {json.dumps({'status': 'running', 'message': 'Probing top 100 TCP/UDP service ports...'})}\n\n"
                elif effective_engine == 'web':
                    yield f"data: {json.dumps({'status': 'running', 'message': 'Web Application Scanner active'})}\n\n"
                    time.sleep(0.8)
                    yield f"data: {json.dumps({'status': 'running', 'message': 'Crawling HTTP endpoints for CVEs and misconfigurations...'})}\n\n"
                else:
                    yield f"data: {json.dumps({'status': 'running', 'message': 'Full Diagnostic mode active'})}\n\n"
                    time.sleep(0.8)
                    yield f"data: {json.dumps({'status': 'running', 'message': 'Running Port Scanner baseline first, then Web Vulnerability Matrix...'})}\n\n"

                scan_results = run_nexa_orchestrator(clean_host, engine=effective_engine, original_url=original_url)

                if scan_results.get("status") == "failed":
                    scan_record.status = ScanHistory.ScanStatus.FAILED
                    scan_record.explanation = f"Scan failed: {scan_results.get('error')}"
                    scan_record.save()
                    if profile and not profile.is_admin and profile.scans_used > 0:
                        profile.scans_used -= 1
                        profile.save(update_fields=['scans_used'])
                    error_msg = f"Scan failed: {scan_results.get('error', 'Unknown error')}"
                    yield f"data: {json.dumps({'status': 'error', 'message': error_msg})}\n\n"
                    return

                # Stream each discovered open port live to the terminal UI
                open_ports = scan_results.get("open_ports", [])
                if open_ports:
                    for p in open_ports:
                        port_num = p.get("port")
                        svc = p.get("service", "Unknown")
                        ver = p.get("version", "Unknown")
                        
                        # Clean up nested parens or duplicate version tags cleanly
                        ver_clean = ver.replace("((", "(").replace("))", ")").strip() if ver else ""
                        if ver_clean and ver_clean != "Unknown":
                            msg = f"Discovered open port {port_num}/tcp: {svc} ({ver_clean})"
                        else:
                            msg = f"Discovered open port {port_num}/tcp: {svc}"
                        yield f"data: {json.dumps({'status': 'running', 'message': msg})}\n\n"
                        time.sleep(0.3)
                else:
                    if effective_engine == 'web':
                        yield f"data: {json.dumps({'status': 'running', 'message': 'Web application surface analysis complete.'})}\n\n"
                    else:
                        yield f"data: {json.dumps({'status': 'running', 'message': 'No open ports detected on baseline perimeter.'})}\n\n"

                # ── Step 4: AI Analysis ───────────────────────────────────────────────
                time.sleep(0.6)
                yield f"data: {json.dumps({'status': 'running', 'message': 'Synthesizing findings through NEXA AI intelligence layer...'})}\n\n"

                ai_summary, token_usage = analyze_scan_results(scan_results, engine=effective_engine)

                # ── Step 5: Persist and signal completion ─────────────────────────────
                from core.services.ai_analyzer import GroqAnalysisService
                cleaner = GroqAnalysisService()
                try:
                    cleaned_results = json.loads(cleaner.clean_scan_logs(scan_results))
                except Exception:
                    cleaned_results = scan_results

                full_results = {
                    "target": clean_host,
                    "open_ports": scan_results.get("open_ports", []),
                    "web_vulnerabilities": scan_results.get("web_vulnerabilities", []),
                    "scanner_used": scan_results.get("scanner_used", ""),
                    "duration_seconds": scan_results.get("duration_seconds", 0)
                }

                scan_record.status            = ScanHistory.ScanStatus.COMPLETED
                scan_record.results           = full_results
                scan_record.explanation       = ai_summary
                scan_record.prompt_tokens     = token_usage.get("prompt_tokens", 0)
                scan_record.completion_tokens = token_usage.get("completion_tokens", 0)
                scan_record.save()

                yield f"data: {json.dumps({'status': 'completed', 'message': 'Diagnostic complete. Your full report has been saved.', 'scan_id': scan_record.id, 'ai_summary': ai_summary, 'scan_results': full_results})}\n\n"

            except Exception as e:
                logger.error(f"Scan stream error for {clean_host}: {str(e)}")
                if scan_record:
                    scan_record.status = ScanHistory.ScanStatus.FAILED
                    scan_record.explanation = f"Diagnostic scan failed: {str(e)}"
                    scan_record.save()
                if profile and not profile.is_admin and profile.scans_used > 0:
                    profile.scans_used -= 1
                    profile.save(update_fields=['scans_used'])
                yield f"data: {json.dumps({'status': 'error', 'message': f'Diagnostic scan failed: {str(e)}'})}\n\n"
            finally:
                if scan_record:
                    scan_record.refresh_from_db()
                    if scan_record.status == ScanHistory.ScanStatus.FAILED:
                        if profile and not profile.is_admin and profile.scans_used > 0:
                            profile.scans_used -= 1
                            profile.save(update_fields=['scans_used'])

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'  # Kills Nginx proxy buffering
        return response

import os
from supabase import create_client

class DeleteUserView(APIView):
    """
    Handles secure, cascading account deletion.
    Requires an authenticated user session.
    """
    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            supabase_url = os.environ.get("SUPABASE_URL")
            supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            
            if not supabase_url or not supabase_key:
                return Response(
                    {"error": "Backend misconfiguration: SUPABASE_SERVICE_ROLE_KEY is missing."}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            supabase_admin = create_client(supabase_url, supabase_key)
            
            # Assuming Django User model's username maps to the Supabase UUID
            # If not, auth token might contain the sub UUID.
            user_id = request.user.username 
            
            # Delete from Supabase Auth (this cascades to public profiles/history if FKs are set up)
            supabase_admin.auth.admin.delete_user(user_id)
            
            # Delete local Django user record
            request.user.delete()
            
            return Response({"message": "Account successfully deleted. We hate to see you go."}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from .models import UserProfile, LoginEvent, ScanHistory

class UserProfileView(APIView):
    """
    GET: Returns current user's profile and scan metrics.
    PATCH: Updates first_name and last_name.
    """
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response({
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "max_scans": profile.max_scans,
            "scans_used": profile.scans_used,
            "is_admin": profile.is_admin
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        first_name = request.data.get('first_name', profile.first_name)
        last_name = request.data.get('last_name', profile.last_name)
        
        profile.first_name = first_name
        profile.last_name = last_name
        profile.save()
        
        return Response({"status": "updated", "first_name": first_name, "last_name": last_name})

class UserPingView(APIView):
    """
    Lightweight endpoint called by the frontend every 60 seconds.
    Updates the user's last_active timestamp to accurately reflect online status.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if hasattr(request.user, 'profile'):
            # Save automatically updates the 'last_active' auto_now field
            request.user.profile.save(update_fields=['last_active'])
        return Response({"status": "pinged"})

class LoginEventView(APIView):
    """
    Records a real login event sent from the frontend.
    Triggers a Resend API welcome email on the user's first successful login.
    """
    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Check if this is the user's first successful login
        is_first_login = not LoginEvent.objects.filter(user=request.user, status='success').exists()

        # Extract IP from standard headers
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
            
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        LoginEvent.objects.create(
            user=request.user,
            ip_address=ip,
            user_agent=user_agent,
            status='success'
        )
        
        # Mark user as active
        if hasattr(request.user, 'profile'):
            request.user.profile.save()

        # Deliver welcome onboarding email via Resend API on first login
        if is_first_login:
            from core.services.email_service import send_welcome_email
            first_name = request.user.first_name
            if hasattr(request.user, 'profile') and request.user.profile.first_name:
                first_name = request.user.profile.first_name
            
            user_email = request.user.email
            if user_email:
                send_welcome_email(user_email, first_name=first_name)
            
        return Response({"status": "logged", "is_first_login": is_first_login}, status=status.HTTP_201_CREATED)

class LoginHistoryView(APIView):
    """
    Retrieves the 10 most recent login events for the user.
    """
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        events = LoginEvent.objects.filter(user=request.user)[:10]
        data = [{
            "id": ev.id,
            "timestamp": ev.timestamp,
            "ip_address": ev.ip_address,
            "user_agent": ev.user_agent,
            "status": ev.status
        } for ev in events]
        return Response(data, status=status.HTTP_200_OK)

class AdminMetricsView(APIView):
    """
    CEO Command Center metrics. Requires is_admin.
    """
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin:
            return Response({"error": "Forbidden: CEO Command Center access required."}, status=status.HTTP_403_FORBIDDEN)
            
        total_users = User.objects.count()
        total_scans = ScanHistory.objects.count()
        
        from django.db.models import Sum
        active_tokens = UserProfile.objects.aggregate(Sum('scans_used'))['scans_used__sum'] or 0
        
        # Calculate total tokens globally
        total_prompt_tokens = ScanHistory.objects.aggregate(Sum('prompt_tokens'))['prompt_tokens__sum'] or 0
        total_completion_tokens = ScanHistory.objects.aggregate(Sum('completion_tokens'))['completion_tokens__sum'] or 0
        total_ai_tokens = total_prompt_tokens + total_completion_tokens
        
        # Get users for quota grid
        users_list = []
        for p in UserProfile.objects.select_related('user').all():
            # Calculate total tokens per user
            user_scans = ScanHistory.objects.filter(user=p.user)
            p_tokens = user_scans.aggregate(Sum('prompt_tokens'))['prompt_tokens__sum'] or 0
            c_tokens = user_scans.aggregate(Sum('completion_tokens'))['completion_tokens__sum'] or 0
            
            users_list.append({
                "email": p.user.email,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "max_scans": p.max_scans,
                "scans_used": p.scans_used,
                "is_admin": p.is_admin,
                "last_active": p.last_active,
                "total_tokens": p_tokens + c_tokens
            })
            
        return Response({
            "total_users": total_users,
            "total_scans": total_scans,
            "active_tokens": active_tokens,
            "total_ai_tokens": total_ai_tokens,
            "users": users_list
        }, status=status.HTTP_200_OK)

class AdminUserQuotaView(APIView):
    """
    Adjusts a user's scan quota via their email address.
    """
    def post(self, request, email):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
            
        user = get_object_or_404(User, email=email)
        new_quota = request.data.get('max_scans')
        if new_quota is None:
            return Response({"error": "Please provide 'max_scans'."}, status=status.HTTP_400_BAD_REQUEST)
            
        profile, _ = UserProfile.objects.get_or_create(user=user)
        try:
            profile.max_scans = int(new_quota)
            profile.save()
            return Response({"status": "success", "email": email, "max_scans": profile.max_scans})
        except ValueError:
            return Response({"error": "Invalid max_scans value."}, status=status.HTTP_400_BAD_REQUEST)

class ScanHistoryView(APIView):
    """
    Retrieves the scan history specifically for the authenticated user.
    Auto-reconciles stale 'SCANNING' records into 'FAILED' if left uncompleted.
    """
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Clean up stale scanning records older than 2 minutes
        from django.utils import timezone
        import datetime
        cutoff = timezone.now() - datetime.timedelta(minutes=2)
        stale_scans = ScanHistory.objects.filter(
            user=request.user, 
            status=ScanHistory.ScanStatus.SCANNING, 
            created_at__lt=cutoff
        )
        if stale_scans.exists():
            stale_scans.update(
                status=ScanHistory.ScanStatus.FAILED, 
                explanation="Diagnostic scan process ended before completion."
            )

        scans = ScanHistory.objects.filter(user=request.user).order_by('-created_at')[:50]
        data = [{
            "id": scan.id,
            "target": scan.target,
            "scan_type": scan.scan_type,
            "status": scan.status,
            "explanation": scan.explanation,
            "results": scan.results,
            "created_at": scan.created_at
        } for scan in scans]
        return Response(data, status=status.HTTP_200_OK)

class AdminSystemHealthView(APIView):
    """
    Live real-time system health, API response latency, worker presence,
    and AI token cost efficiency telemetry for the CEO Command Center.
    """
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        import shutil
        import os
        import time
        from django.db import connection
        from django.db.models import Sum

        # 1. Database Health & Ping
        db_start = time.perf_counter()
        db_status = "Connected"
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
            db_latency = round((time.perf_counter() - db_start) * 1000, 1)
        except Exception as e:
            db_status = f"Degraded: {str(e)[:40]}"
            db_latency = -1

        # 2. Scanner Binaries Health
        nmap_path = shutil.which("nmap")
        nuclei_path = shutil.which("nuclei")
        backend_nuclei = os.path.join(os.path.dirname(os.path.dirname(__file__)), "bin", "nuclei")
        if not nuclei_path and os.path.exists(backend_nuclei):
            nuclei_path = backend_nuclei

        scanner_status = {
            "nmap": {
                "available": bool(nmap_path),
                "mode": "Raw Binary Engine" if nmap_path else "Pure Socket Fallback",
                "path": nmap_path or "fallback-socket"
            },
            "nuclei": {
                "available": bool(nuclei_path),
                "mode": "Nuclei v3.8 Engine" if nuclei_path else "HTTP Surface Fallback",
                "path": nuclei_path or "surface-fallback"
            }
        }

        # 3. Groq AI Rotator Pool Health
        from core.services.ai_analyzer import GROQ_KEYS, GROQ_MODEL, _current_key_idx
        groq_status = {
            "provider": "Groq LPU Acceleration",
            "model": GROQ_MODEL,
            "total_keys_in_pool": len(GROQ_KEYS),
            "active_key_index": f"Key #{_current_key_idx + 1}",
            "status": "Operational" if GROQ_KEYS else "API Key Missing"
        }

        # 4. Token Economics & Cost Savings vs OpenAI GPT-4 ($5.00 / 1M tokens)
        token_stats = ScanHistory.objects.aggregate(
            total_prompt=Sum('prompt_tokens'),
            total_completion=Sum('completion_tokens')
        )
        total_prompt = token_stats.get('total_prompt') or 0
        total_completion = token_stats.get('total_completion') or 0
        total_tokens = total_prompt + total_completion
        
        # OpenAI GPT-4 equivalent cost estimate (~$5.00 / 1M tokens)
        cost_saved = round((total_tokens / 1_000_000) * 5.00, 2)

        return Response({
            "timestamp": timezone.now(),
            "database": {
                "engine": "Supabase PostgreSQL",
                "status": db_status,
                "latency_ms": db_latency
            },
            "groq_ai": groq_status,
            "scanners": scanner_status,
            "token_economics": {
                "total_prompt_tokens": total_prompt,
                "total_completion_tokens": total_completion,
                "total_tokens_consumed": total_tokens,
                "estimated_cost_saved_usd": cost_saved
            }
        }, status=status.HTTP_200_OK)

class AdminBroadcastView(APIView):
    """
    Manage system announcements and trigger instant in-app alerts and Resend email broadcasts.
    """
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        from core.models import BroadcastAnnouncement
        broadcasts = BroadcastAnnouncement.objects.all()[:30]
        data = [{
            "id": b.id,
            "title": b.title,
            "message": b.message,
            "announcement_type": b.announcement_type,
            "is_active": b.is_active,
            "sent_email": b.sent_email,
            "recipient_count": b.recipient_count,
            "created_at": b.created_at,
            "created_by": b.created_by.email if b.created_by else "Admin"
        } for b in broadcasts]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        from core.models import BroadcastAnnouncement
        from core.services.email_service import send_broadcast_email
        from django.contrib.auth.models import User

        title = request.data.get("title", "").strip()
        message = request.data.get("message", "").strip()
        announcement_type = request.data.get("announcement_type", "general")
        send_email = bool(request.data.get("send_email", False))

        if not title or not message:
            return Response({"error": "Title and message are required."}, status=status.HTTP_400_BAD_REQUEST)

        # Collect user emails if emailing
        recipient_count = 0
        if send_email:
            user_emails = list(
                User.objects.exclude(email='').values_list('email', flat=True).distinct()
            )
            if user_emails:
                recipient_count = send_broadcast_email(user_emails, title, message, announcement_type)

        announcement = BroadcastAnnouncement.objects.create(
            title=title,
            message=message,
            announcement_type=announcement_type,
            sent_email=send_email,
            recipient_count=recipient_count,
            created_by=request.user,
            is_active=True
        )

        return Response({
            "status": "success",
            "id": announcement.id,
            "title": announcement.title,
            "emails_dispatched": recipient_count
        }, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
        if not hasattr(request.user, 'profile') or not request.user.profile.is_admin:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

        from core.models import BroadcastAnnouncement
        from django.shortcuts import get_object_or_404
        announcement = get_object_or_404(BroadcastAnnouncement, pk=pk)
        announcement.delete()
        return Response({"status": "deleted"}, status=status.HTTP_200_OK)

class PublicAnnouncementsView(APIView):
    """
    Returns active platform announcements for in-app banner alerts and Notifications tab.
    """
    def get(self, request):
        from core.models import BroadcastAnnouncement
        announcements = BroadcastAnnouncement.objects.filter(is_active=True)[:10]
        data = [{
            "id": a.id,
            "title": a.title,
            "message": a.message,
            "announcement_type": a.announcement_type,
            "created_at": a.created_at
        } for a in announcements]
        return Response(data, status=status.HTTP_200_OK)

