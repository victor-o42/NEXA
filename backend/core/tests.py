import json
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status


class HeartbeatApiTests(APITestCase):
    client: APIClient

    def test_heartbeat_returns_success(self):
        """
        Verify that the heartbeat API responds with status 200 and correct structure.
        """
        url = reverse('heartbeat')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')
        self.assertEqual(response.data['system'], 'NEXA Backend Operational Engine')
        self.assertIn('timestamp', response.data)
        self.assertIn('version', response.data)


class ScanTriggerApiTests(APITestCase):
    client: APIClient

    def test_scan_trigger_with_empty_target(self):
        """
        Verify that triggering a scan with no target returns bad request.
        """
        url = reverse('scan-trigger')
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_scan_trigger_with_self_scan_target(self):
        """
        Rule 1 Check: Verify that triggering a scan targeting NEXA or localhost is blocked 
        and returns the custom personality-driven message.
        """
        url = reverse('scan-trigger')
        self_scan_targets = [
            "localhost",
            "127.0.0.1",
            "nexa-scan.click",
            "http://localhost:8000",
            "https://staging.nexa-scan.click/api/v1/"
        ]

        for target in self_scan_targets:
            response = self.client.post(url, {"target": target}, format='json')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data['self_scan_detected'])
            self.assertEqual(response.data['status'], 'blocked')
            self.assertIn("👀 I see what you did there... You’re scanning NEXA itself.", response.data['message'])

    def test_scan_trigger_with_valid_external_target(self):
        """
        Verify that triggering a scan targeting a valid external domain is accepted.
        """
        url = reverse('scan-trigger')
        response = self.client.post(url, {"target": "example.com"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertFalse(response.data['self_scan_detected'])
        self.assertEqual(response.data['status'], 'initialized')
        self.assertEqual(response.data['target'], 'example.com')
        self.assertIn('steps', response.data)


# We'll import these to write clean unit tests for the core models we just built.
from core.models import ScanHistory
from django.contrib.auth.models import User
from django.test import TestCase

class ScanHistoryModelTests(TestCase):
    def test_scan_history_creation_and_attributes(self):
        """
        Let's make sure the database model is holding, tracking, and returning
        scan entries exactly how we want. 🚀
        """
        # Set up a test user to represent the scanning accounts.
        user = User.objects.create_user(username="victor_test", password="securepass123")
        
        # Build out a dummy scan matching standard diagnostic outputs.
        scan = ScanHistory.objects.create(
            user=user,
            target="example.com",
            scan_type=ScanHistory.ScanType.WEB,
            status=ScanHistory.ScanStatus.COMPLETED,
            results={"ports_open": [80, 443], "vulnerabilities": []},
            explanation="Everything looks neat and tidy. All clear here! 😄"
        )
        
        # Quick assertions to ensure sanity checks pass.
        self.assertEqual(scan.user.username, "victor_test")
        self.assertEqual(scan.target, "example.com")
        self.assertEqual(scan.scan_type, "WEB")
        self.assertEqual(scan.status, "COMPLETED")
        self.assertEqual(scan.results["ports_open"], [80, 443])
        self.assertIn("neat and tidy", scan.explanation)
        self.assertIsNotNone(scan.created_at)
        
        # Verify the custom str output format we wrote earlier.
        self.assertEqual(
            str(scan),
            f"WEB -> example.com (COMPLETED) at {scan.created_at.strftime('%Y-%m-%d %H:%M')}"
        )


# We'll import mocks to safely test port scanning without generating real network sockets.
from unittest.mock import patch, MagicMock
from core.services.port_scanner import run_port_scan

class PortScannerServiceTests(TestCase):
    def test_scan_with_invalid_domain(self):
        """
        Verify that resolution failures on bogus domains return a clean 
        error result without breaking the thread pool. 👀
        """
        result = run_port_scan("invalid-target.domain-does-not-exist-xyz")
        self.assertEqual(result["status"], "failed")
        self.assertIn("Failed to resolve", result["error"])
        
    @patch("core.services.port_scanner.NMAP_AVAILABLE", False)
    @patch("socket.gethostbyname")
    @patch("socket.socket")
    def test_scan_with_mocked_results(self, mock_socket_class, mock_gethostbyname):
        """
        Let's mock connection status checks to make sure the thread pool 
        is aggregating open/closed ports accurately in our final metadata. 🚀
        """
        # Mock gethostbyname to return a dummy IP
        mock_gethostbyname.return_value = "192.168.1.100"
        
        # Create a mock socket instance
        mock_socket = MagicMock()
        mock_socket_class.return_value = mock_socket
        
        # We'll mock connect_ex:
        # Return 0 (success/open) for port 80 and 443, and 111 (closed) for others.
        def connect_ex_mock(address):
            host, port = address
            if port in [80, 443]:
                return 0  # Open
            return 111  # Connection refused/Closed
            
        mock_socket.connect_ex.side_effect = connect_ex_mock
        
        # Run the mock scan over a specific list of ports to keep it fast
        result = run_port_scan("mock-target.com", ports_to_scan=[22, 80, 443, 3306])
        
        # Assertions
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["resolved_ip"], "192.168.1.100")
        
        # We expect exactly 2 open ports (80 and 443)
        open_ports = [item["port"] for item in result["open_ports"]]
        self.assertEqual(open_ports, [80, 443])
        
        # Check all ports checked are correct
        all_ports = [item["port"] for item in result["all_ports_checked"]]
        self.assertEqual(sorted(all_ports), [22, 80, 443, 3306])

    @patch("core.services.port_scanner.NMAP_AVAILABLE", True)
    @patch("socket.gethostbyname")
    @patch("nmap.PortScanner")
    def test_scan_with_nmap_success(self, mock_port_scanner_class, mock_gethostbyname):
        """
        Verify that our PortScanner service correctly executes Nmap scans
        and extracts service versions, protocols, and port statuses. 🚀
        """
        mock_gethostbyname.return_value = "192.168.1.100"
        
        # Instantiate mock scanner
        mock_scanner = MagicMock()
        mock_port_scanner_class.return_value = mock_scanner
        
        # Mock hosts in Nmap results
        mock_scanner.all_hosts.return_value = ["192.168.1.100"]
        
        # Mock Nmap internal data representation for 192.168.1.100
        mock_host_data = MagicMock()
        mock_host_data.all_protocols.return_value = ["tcp"]
        
        mock_host_data.__getitem__.return_value = {
            80: {
                "state": "open",
                "name": "http",
                "product": "nginx",
                "version": "1.18.0",
                "extrainfo": "Ubuntu"
            },
            443: {
                "state": "open",
                "name": "https",
                "product": "nginx",
                "version": "1.18.0",
                "extrainfo": ""
            }
        }
        
        mock_scanner.__getitem__.return_value = mock_host_data
        
        # Run scan
        result = run_port_scan("nexa-target.com", ports_to_scan=[80, 443, 3306])
        
        # Verify scan details
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["scanner_used"], "Nmap")
        self.assertEqual(result["resolved_ip"], "192.168.1.100")
        
        # Verify open ports and parsed Nmap version info
        open_ports = result["open_ports"]
        self.assertEqual(len(open_ports), 2)
        
        # Port 80 checks
        p80 = open_ports[0]
        self.assertEqual(p80["port"], 80)
        self.assertEqual(p80["service"], "http")
        self.assertEqual(p80["protocol"], "tcp")
        self.assertEqual(p80["version"], "nginx 1.18.0 (Ubuntu)")
        
        # Port 443 checks
        p443 = open_ports[1]
        self.assertEqual(p443["port"], 443)
        self.assertEqual(p443["service"], "https")
        self.assertEqual(p443["version"], "nginx 1.18.0")
        
        # Port 3306 check (should fall back to closed)
        all_ports = result["all_ports_checked"]
        p3306 = next(p for p in all_ports if p["port"] == 3306)
        self.assertEqual(p3306["status"], "closed")
        self.assertEqual(p3306["version"], "Unknown")


# We'll import these to verify our unified orchestrator pipeline, NSE script logs, and Nuclei web scanner checks.
from core.services.orchestrator import run_nexa_orchestrator

class NexaOrchestratorTests(TestCase):
    def test_self_scan_interceptor(self):
        """
        Verify that our Section 7 Self-Scan interceptor instantly blocks scans 
        targeting NEXA's domain or loopbacks. 😄
        """
        result = run_nexa_orchestrator("nexa-scan.click")
        self.assertEqual(result["status"], "blocked")
        self.assertTrue(result.get("is_self_scan"))
        self.assertIn("👀 I see what you did there...", result["message"])
        self.assertEqual(len(result["vulnerabilities"]), 1)
        self.assertEqual(result["vulnerabilities"][0]["title"], "Ego Boost Active")

    @patch("core.services.orchestrator.NMAP_AVAILABLE", True)
    @patch("socket.gethostbyname")
    @patch("nmap.PortScanner")
    @patch("shutil.which")
    @patch("subprocess.run")
    def test_orchestrator_full_mocks(self, mock_subprocess_run, mock_shutil_which, mock_port_scanner_class, mock_gethostbyname):
        """
        Ensure Nmap safe NSE script outcomes and Nuclei JSON lines outputs
        combine cleanly into our unified scan results packet. 🚀
        """
        mock_gethostbyname.return_value = "192.168.1.100"
        mock_shutil_which.return_value = "/usr/bin/nuclei"
        
        # Mock Nmap PortScanner
        mock_scanner = MagicMock()
        mock_port_scanner_class.return_value = mock_scanner
        mock_scanner.all_hosts.return_value = ["192.168.1.100"]
        mock_host_data = MagicMock()
        mock_host_data.all_protocols.return_value = ["tcp"]
        mock_host_data.__getitem__.return_value = {
            80: {
                "state": "open",
                "name": "http",
                "product": "Apache",
                "version": "2.4.41",
                "extrainfo": "Ubuntu",
                # Mock NSE script vulnerabilities output!
                "script": {
                    "http-vuln-cve2017-5638": "vulnerable to Struts RCE"
                }
            }
        }
        mock_scanner.__getitem__.return_value = mock_host_data
        
        # Mock Nuclei process stdout containing JSON lines
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.stdout = json.dumps({
            "template-id": "cve-2021-34473",
            "info": {
                "name": "Exchange Server RCE",
                "severity": "critical",
                "description": "ProxyShell vulnerability detected.",
                "remediation": "Apply KB patches."
            },
            "matched-at": "https://nexa-target.com"
        }) + "\n"
        mock_subprocess_run.return_value = mock_process
        
        # Execute unified orchestrator scan
        result = run_nexa_orchestrator("nexa-target.com")
        
        # Assertions
        self.assertEqual(result["status"], "completed")
        self.assertTrue(result["nmap_advanced"])
        self.assertTrue(result["nuclei_active"])
        self.assertEqual(result["resolved_ip"], "192.168.1.100")
        
        # Nmap NSE assertions
        open_ports = result["open_ports"]
        self.assertEqual(len(open_ports), 1)
        p80 = open_ports[0]
        self.assertEqual(p80["port"], 80)
        self.assertEqual(p80["version"], "Apache 2.4.41 (Ubuntu)")
        self.assertEqual(len(p80["nse_findings"]), 1)
        self.assertEqual(p80["nse_findings"][0]["script_name"], "http-vuln-cve2017-5638")
        
        # Nuclei assertions
        web_vulns = result["web_vulnerabilities"]
        self.assertEqual(len(web_vulns), 1)
        v = web_vulns[0]
        self.assertEqual(v["template_id"], "cve-2021-34473")
        self.assertEqual(v["severity"], "critical")




