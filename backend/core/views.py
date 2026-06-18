from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
import urllib.parse
import socket
import re
import time
from core.models import ScanHistory
from core.services.orchestrator import run_nexa_orchestrator

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
            if any(domain in clean_host for domain in self_scan_domains):
                time.sleep(1.5)
                yield f"data: {json.dumps({'status': 'blocked', 'message': 'Scanning NEXA itself? Bold move. Internal confidence check complete — all shields active.'})}\n\n"
                ScanHistory.objects.create(
                    user=current_user,
                    target=clean_host,
                    scan_type=ScanHistory.ScanType.PORT,
                    status=ScanHistory.ScanStatus.BLOCKED,
                    explanation="👀 Self-scan attempt blocked. Ego slightly boosted."
                )
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

            # --- Target validated and recorded, decrement available scans ---
            if current_user and hasattr(current_user, 'profile'):
                profile = current_user.profile
                if not profile.is_admin:
                    profile.scans_used += 1
                    profile.save()

            # ── Stream the correction notice before anything else ─────────────────
            if correction_msg:
                time.sleep(1.0)
                yield f"data: {json.dumps({'status': 'notice', 'message': correction_msg})}\n\n"

            # ── Step 2: DNS Resolution check ─────────────────────────────────────
            time.sleep(1.0)
            yield f"data: {json.dumps({'status': 'running', 'message': f'Resolving target: {clean_host}...'})}\n\n"

            try:
                resolved_ip = socket.gethostbyname(clean_host)
                time.sleep(1.5)
                yield f"data: {json.dumps({'status': 'running', 'message': f'Resolved to {resolved_ip}. Initializing diagnostic engines...'})}\n\n"
            except socket.gaierror:
                scan_record.status = ScanHistory.ScanStatus.FAILED
                scan_record.explanation = f"DNS resolution failed for '{clean_host}'."
                scan_record.save()
                error_msg = f"DNS resolution failed for '{clean_host}'. Double check the target and try again."
                yield f"data: {json.dumps({'status': 'error', 'message': error_msg})}\n\n"
                return

            # ── Step 3: Run the Orchestrator ──────────────────────────────────────
            time.sleep(1.5)
            if effective_engine == 'port':
                yield f"data: {json.dumps({'status': 'running', 'message': 'Port Scanning Engine active — probing top 100 TCP/UDP service ports...'})}\n\n"
            elif effective_engine == 'web':
                yield f"data: {json.dumps({'status': 'running', 'message': 'Web Application Scanner active — crawling HTTP endpoints for CVEs and misconfigurations...'})}\n\n"
            else:
                yield f"data: {json.dumps({'status': 'running', 'message': 'Full Diagnostic mode — Port Scanner running first, then Web Vulnerability Matrix...'})}\n\n"

            scan_results = run_nexa_orchestrator(clean_host, engine=effective_engine, original_url=original_url)

            if scan_results.get("status") == "failed":
                scan_record.status = ScanHistory.ScanStatus.FAILED
                scan_record.explanation = f"Scan failed: {scan_results.get('error')}"
                scan_record.save()
                error_msg = f"Scan failed: {scan_results.get('error', 'Unknown error')}"
                yield f"data: {json.dumps({'status': 'error', 'message': error_msg})}\n\n"
                return

            # ── Step 4: AI Analysis ───────────────────────────────────────────────
            yield f"data: {json.dumps({'status': 'running', 'message': 'Synthesizing findings through NEXA AI intelligence layer...'})}\n\n"

            ai_summary = analyze_scan_results(scan_results, engine=effective_engine)

            # ── Step 5: Persist and signal completion ─────────────────────────────
            # Save only the heavily optimized/filtered logs to the DB to save massive storage space
            from core.services.ai_analyzer import GroqAnalysisService
            cleaner = GroqAnalysisService()
            try:
                cleaned_results = json.loads(cleaner.clean_scan_logs(scan_results))
            except Exception:
                cleaned_results = {"error": "Failed to clean logs."}

            scan_record.status      = ScanHistory.ScanStatus.COMPLETED
            scan_record.results     = cleaned_results
            scan_record.explanation = ai_summary
            scan_record.save()

            yield f"data: {json.dumps({'status': 'completed', 'message': 'Diagnostic complete. Your full report has been saved.', 'scan_id': scan_record.id, 'ai_summary': ai_summary, 'scan_results': cleaned_results})}\n\n"

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

class LoginEventView(APIView):
    """
    Records a real login event sent from the frontend.
    """
    def post(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
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
        return Response({"status": "logged"}, status=status.HTTP_201_CREATED)

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
        
        # We can sum all scans_used as token consumption
        from django.db.models import Sum
        active_tokens = UserProfile.objects.aggregate(Sum('scans_used'))['scans_used__sum'] or 0
        
        # Get users for quota grid
        users_list = []
        for p in UserProfile.objects.select_related('user').all():
            users_list.append({
                "email": p.user.email,
                "first_name": p.first_name,
                "last_name": p.last_name,
                "max_scans": p.max_scans,
                "scans_used": p.scans_used,
                "is_admin": p.is_admin
            })
            
        return Response({
            "total_users": total_users,
            "total_scans": total_scans,
            "active_tokens": active_tokens,
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
    Retrieves the scan history specifically for the authenticated user, bypassing the raw Supabase logic.
    """
    def get(self, request):
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)
            
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
