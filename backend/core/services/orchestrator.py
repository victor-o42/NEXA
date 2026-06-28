import os
import sys
import socket
import shutil
import subprocess
import json
import time
from core.models import ScanHistory
from core.services.port_scanner import run_port_scan, NMAP_AVAILABLE, COMMON_PORTS
import nmap

def run_nexa_orchestrator(target: str, engine: str = 'port', original_url: str | None = None, user=None) -> dict:
    """
    Unified operational gateway for scans. Routes to the correct engine(s)
    based on the `engine` flag: 'port', 'web', or 'full'.
    The Self-Scan Awareness routine intercepts our own domains early. 👀
    """
    start_time = time.time()

    clean_target = target.lower().strip()
    # Strip any leftover protocol or port from the host string
    if "://" in clean_target:
        try:
            import urllib.parse
            parsed = urllib.parse.urlparse(clean_target)
            clean_target = parsed.hostname or parsed.path.split('/')[0]
        except Exception:
            pass
    if ":" in clean_target:
        clean_target = clean_target.split(":")[0]

    # Determine the web URL to use — caller can pass the original full URL for Nuclei
    web_url = original_url or f"https://{clean_target}"

    # Rule 1: Self-Scan Easter Egg still lives here as a safety net
    self_scan_domains = ["nexa-scan.click", "localhost", "127.0.0.1", "staging.nexa-scan.click"]
    if any(domain in clean_target for domain in self_scan_domains):
        return {
            "target": target,
            "status": "blocked",
            "is_self_scan": True,
            "engine": engine,
            "message": "👀 I see what you did there... Running internal confidence check... All shields active. Ego slightly boosted.",
            "duration_seconds": 0.05,
            "open_ports": [],
            "web_vulnerabilities": [],
        }

    # Base output structure — gets populated by whichever engines run
    scan_results: dict = {
        "target": clean_target,
        "engine": engine,
        "resolved_ip": None,
        "status": "completed",
        "scanner_used": [],
        "nmap_advanced": NMAP_AVAILABLE,
        "nuclei_active": False,
        "open_ports": [],
        "all_ports_checked": [],
        "web_vulnerabilities": [],
        "duration_seconds": 0.0,
        "error": None
    }

    # DNS resolution — happens regardless of engine choice
    try:
        resolved_ip = socket.gethostbyname(clean_target)
        scan_results["resolved_ip"] = resolved_ip
    except socket.gaierror:
        scan_results["status"] = "failed"
        scan_results["error"] = f"DNS resolution failed for '{clean_target}'. Check the target and try again."
        return scan_results

    # ── PORT SCANNING ENGINE (Nmap / Socket fallback) ─────────────────────────
    # Runs when engine is 'port' or 'full'
    if engine in ('port', 'full'):
        if NMAP_AVAILABLE:
            try:
                nm = nmap.PortScanner()

                # -T4 = aggressive timing, -F = top 100 ports, --version-light = fast service probing
                nm.scan(hosts=resolved_ip, arguments="-T4 -F --version-light --open")

                if resolved_ip in nm.all_hosts():
                    host_data = nm[resolved_ip]
                    for proto in host_data.all_protocols():
                        for port in host_data[proto].keys():
                            port_data = host_data[proto][port]

                            prod    = port_data.get("product", "").strip()
                            ver     = port_data.get("version", "").strip()
                            extra   = port_data.get("extrainfo", "").strip()
                            ver_str = f"{prod} {ver}".strip()
                            if extra:
                                ver_str += f" ({extra})"
                            if not ver_str:
                                ver_str = "Unknown"

                            scripts_output = port_data.get("script", {})
                            nse_findings = [
                                {"script_name": sn, "description": sd.strip()}
                                for sn, sd in scripts_output.items()
                            ]

                            entry = {
                                "port": int(port),
                                "protocol": proto,
                                "service": port_data.get("name", "Unknown"),
                                "status": port_data.get("state", "closed"),
                                "version": ver_str,
                                "nse_findings": nse_findings,
                            }
                            if entry["status"] == "open":
                                scan_results["open_ports"].append(entry)
                            scan_results["all_ports_checked"].append(entry)

                # Back-fill any common ports that Nmap didn't return as closed
                checked_ports = {item["port"] for item in scan_results["all_ports_checked"]}
                for p in COMMON_PORTS.keys():
                    if p not in checked_ports:
                        scan_results["all_ports_checked"].append({
                            "port": p, "protocol": "tcp",
                            "service": COMMON_PORTS[p], "status": "closed",
                            "version": "Unknown", "nse_findings": [],
                        })

                scan_results["scanner_used"].append("Nmap")

            except Exception as e:
                fallback = run_port_scan(clean_target)
                scan_results["open_ports"]       = fallback["open_ports"]
                scan_results["all_ports_checked"] = fallback["all_ports_checked"]
                scan_results["scanner_used"].append(f"SocketFallback (Nmap err: {str(e)})")
        else:
            fallback = run_port_scan(clean_target)
            scan_results["open_ports"]       = fallback["open_ports"]
            scan_results["all_ports_checked"] = fallback["all_ports_checked"]
            scan_results["scanner_used"].append("SocketFallback")

    # ── WEB APPLICATION SCANNING ENGINE (Nuclei) ──────────────────────────────
    # Runs when engine is 'web' or 'full'
    if engine in ('web', 'full'):
        # Check local project bin first (for Pxxl cloud deployment), then fallback to PATH
        local_nuclei = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "bin", "nuclei")
        if os.path.exists(local_nuclei):
            nuclei_bin = local_nuclei
        else:
            nuclei_bin = shutil.which("nuclei")
            
        if nuclei_bin:
            try:
                scan_results["nuclei_active"] = True
                cmd = [
                    nuclei_bin, "-u", web_url,
                    "-tags", "cve,misconfig,exposed",
                    "-silent", "-json-export", "-"
                ]
                # Hard cap: Nuclei can stall indefinitely without a timeout
                process = subprocess.run(
                    cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    text=True, timeout=30
                )

                if process.returncode == 0 and process.stdout:
                    for line in process.stdout.splitlines():
                        if line.strip():
                            try:
                                v = json.loads(line)
                                scan_results["web_vulnerabilities"].append({
                                    "template_id": v.get("template-id"),
                                    "name":        v.get("info", {}).get("name"),
                                    "severity":    v.get("info", {}).get("severity"),
                                    "description": v.get("info", {}).get("description", "No description available."),
                                    "matched_at":  v.get("matched-at"),
                                    "remediation": v.get("info", {}).get("remediation", ""),
                                })
                            except Exception:
                                pass

                scan_results["scanner_used"].append("Nuclei")

            except Exception as e:
                pass
        else:
            # Nuclei not on PATH
            pass

    scan_results["duration_seconds"] = round(time.time() - start_time, 2)
    scan_results["scanner_used"] = " + ".join(scan_results["scanner_used"]) or "None"
    return scan_results
