from django.db import models
from django.contrib.auth.models import User

class ScanHistory(models.Model):
    """
    Core database ledger tracking scan metrics, live lifecycle statuses, 
    raw tool outputs, and personalized AI guidance summaries.
    """
    
    # Simple choice categories to divide web vulnerability scanning from network/port diagnostics.
    class ScanType(models.TextChoices):
        WEB = "WEB", "Web Vulnerability Scan"
        PORT = "PORT", "Port Diagnostic Scan"
        
    # Scanning stages. These map to the live status streaming updates on the PWA client.
    class ScanStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SCANNING = "SCANNING", "Scanning"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"
        BLOCKED = "BLOCKED", "Blocked"

    # User connection. Optional field so that guest runs still work without full registration. 👀
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="scans",
        null=True,
        blank=True,
        help_text="User who initiated this scan. Left empty for public/anonymous trials."
    )
    
    target = models.CharField(
        max_length=255,
        help_text="Target URL, domain address, or raw IP address scanned."
    )
    
    scan_type = models.CharField(
        max_length=10,
        choices=ScanType.choices,
        default=ScanType.WEB,
        help_text="Vulnerability scanner classification."
    )
    
    status = models.CharField(
        max_length=15,
        choices=ScanStatus.choices,
        default=ScanStatus.PENDING,
        help_text="Operational execution status of the scanner."
    )
    
    # Store the complete JSON payloads from tools like Nmap or Nuclei directly.
    # Enables advanced downstream AI reasoning and client-side visualization.
    results = models.JSONField(
        default=dict,
        blank=True,
        help_text="Unstructured raw findings returned by scanning engine utilities."
    )
    
    # Easy-to-read AI-generated summaries and copy-paste remediation scripts.
    explanation = models.TextField(
        blank=True,
        help_text="Friendly AI-generated context translating tech jargon to educational, human-readable instructions."
    )
    
    # Keep perfect timeline records for dashboard metrics and West African cloud latency checks.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Scan History"
        verbose_name_plural = "Scan Histories"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.scan_type} -> {self.target} ({self.status}) at {self.created_at.strftime('%Y-%m-%d %H:%M')}"

class UserProfile(models.Model):
    """
    Extends the Django User model to track scan credits and RBAC flags.
    Automatically provisioned by SupabaseJWTAuthentication.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    max_scans = models.IntegerField(default=5, help_text="Maximum allowed scans for standard users.")
    scans_used = models.IntegerField(default=0, help_text="Number of scans performed by this user.")
    is_admin = models.BooleanField(default=False, help_text="Grants CEO Command Center access and bypasses scan quotas.")

    def __str__(self):
        return f"Profile: {self.user.username}"

class LoginEvent(models.Model):
    """
    Audit log tracking real login sessions.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_events')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='success')

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} login at {self.timestamp}"
