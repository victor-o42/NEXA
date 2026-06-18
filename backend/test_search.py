import os
import django
import sys

# Setup Django environment
sys.path.append(r"C:\Users\DELL\Desktop\VXT_2.0\NEXA\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nexa_backend.settings")
django.setup()

from core.services.ai_analyzer import GroqAnalysisService

analyzer = GroqAnalysisService()

# A dummy scan result that contains a made up or very recent CVE that the AI must look up
dummy_scan = {
    "target": "test-system",
    "duration_seconds": 10,
    "scanner_used": "Nmap",
    "open_ports": [
        {
            "port": 22,
            "protocol": "tcp",
            "service": "ssh",
            "state": "open",
            "version": "OpenSSH 9.6p1 (CVE-2024-6387)"
        }
    ]
}

print("Running AI analysis to see if it searches the web for CVE-2024-6387...")
result = analyzer.analyze_vulnerabilities(dummy_scan)
print("\n--- AI Result ---")
print(result)
