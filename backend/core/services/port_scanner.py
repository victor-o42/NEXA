import os
import sys
import socket
import time
from concurrent.futures import ThreadPoolExecutor
import nmap
from typing import Any

# Standard ports that give a baseline view of a target's exposed perimeter.
COMMON_PORTS = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    111: "RPCBind",
    135: "MSRPC",
    139: "NetBIOS",
    143: "IMAP",
    443: "HTTPS",
    445: "Microsoft-DS",
    993: "IMAPS",
    995: "POP3S",
    1723: "PPTP",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    8080: "HTTP-Proxy"
}

# Programmatically append standard Windows Nmap paths to PATH.
# This prevents annoying PATH refresh issues after Nmap installation on Windows! 😄
if sys.platform == "win32":
    nmap_folders = [
        r"C:\Program Files (x86)\Nmap",
        r"C:\Program Files\Nmap"
    ]
    for folder in nmap_folders:
        if os.path.exists(folder) and folder not in os.environ.get("PATH", ""):
            os.environ["PATH"] += os.pathsep + folder

# Verify if the Nmap binary is actually ready to roll on this machine.
try:
    _ = nmap.PortScanner()
    NMAP_AVAILABLE = True
except nmap.PortScannerError:
    NMAP_AVAILABLE = False

def check_port_socket(ip: str, port: int, timeout: float = 1.0) -> dict:
    """
    Standard socket-based port check. Acts as our extremely robust local fallback 
    if Nmap is not installed or when running offline local tests. 😄
    """
    result = {
        "port": port,
        "service": COMMON_PORTS.get(port, "Unknown"),
        "status": "closed",
        "version": "Unknown",
        "protocol": "tcp"
    }
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    
    try:
        error_code = sock.connect_ex((ip, port))
        if error_code == 0:
            result["status"] = "open"
    except Exception:
        pass
    finally:
        sock.close()
        
    return result

def run_port_scan(target: str, ports_to_scan: list[int] | None = None) -> dict:
    """
    Resolves targets, executes an advanced Nmap version detection scan if available,
    and falls back cleanly to concurrent sockets if Nmap is absent.
    """
    start_time = time.time()
    ports = ports_to_scan or list(COMMON_PORTS.keys())
    
    scan_meta: dict[str, Any] = {
        "target": target,
        "resolved_ip": None,
        "status": "completed",
        "scanner_used": "Nmap" if NMAP_AVAILABLE else "SocketFallback",
        "open_ports": [],
        "all_ports_checked": [],
        "duration_seconds": 0.0,
        "error": None
    }
    
    # Try translating domain names to IP addresses first.
    try:
        clean_target = target
        if "://" in target:
            clean_target = target.split("://")[1].split("/")[0].split(":")[0]
            
        resolved_ip = socket.gethostbyname(clean_target)
        scan_meta["resolved_ip"] = resolved_ip
    except socket.gaierror:
        scan_meta["status"] = "failed"
        scan_meta["error"] = f"Failed to resolve target: '{target}'"
        return scan_meta

    if NMAP_AVAILABLE:
        try:
            # We construct a comma-separated list of ports to scan.
            ports_str = ",".join(str(p) for p in ports)
            nm = nmap.PortScanner()
            
            # Execute a safe, non-destructive version detection scan (-sV) against baseline ports.
            # -T4 speeds up execution, --open filters out closed ports to save parsing overhead.
            nm.scan(hosts=resolved_ip, ports=ports_str, arguments="-sV -T4 --open --host-timeout 15s --max-retries 1")
            
            # Parse Nmap results. If the host is found in Nmap's scan list:
            if resolved_ip in nm.all_hosts():
                host_data = nm[resolved_ip]
                protocols = host_data.all_protocols()
                
                # Check for TCP/UDP ports
                for proto in protocols:
                    proto_ports = host_data[proto].keys()
                    for port in proto_ports:
                        port_data = host_data[proto][port]
                        
                        # Gather version metrics cleanly
                        product = port_data.get("product", "").strip()
                        version = port_data.get("version", "").strip()
                        extrainfo = port_data.get("extrainfo", "").strip()
                        
                        version_str = f"{product} {version}".strip()
                        if extrainfo:
                            version_str += f" ({extrainfo})"
                        if not version_str:
                            version_str = "Unknown"
                            
                        entry = {
                            "port": int(port),
                            "protocol": proto,
                            "service": port_data.get("name", "Unknown"),
                            "status": port_data.get("state", "closed"),
                            "version": version_str
                        }
                        
                        if entry["status"] == "open":
                            scan_meta["open_ports"].append(entry)
                        scan_meta["all_ports_checked"].append(entry)
            
            # For any ports in our requested list that Nmap reported as closed/filtered,
            # we make sure they are documented in all_ports_checked.
            scanned_ports = {item["port"] for item in scan_meta["all_ports_checked"]}
            for port in ports:
                if port not in scanned_ports:
                    scan_meta["all_ports_checked"].append({
                        "port": port,
                        "protocol": "tcp",
                        "service": COMMON_PORTS.get(port, "Unknown"),
                        "status": "closed",
                        "version": "Unknown"
                    })
                    
        except Exception as e:
            # If the Nmap process throws an unexpected exception, we log the crash
            # and fall back to the safe socket scan so the user doesn't see a 500 error! 👀
            scan_meta["scanner_used"] = f"SocketFallback (Error Recovery: {str(e)})"
            _run_socket_fallback(resolved_ip, ports, scan_meta)
    else:
        # Standard fallback to sockets when Nmap is not installed.
        _run_socket_fallback(resolved_ip, ports, scan_meta)
        
    # Sort all checked ports numerically
    scan_meta["all_ports_checked"].sort(key=lambda x: x["port"])
    scan_meta["open_ports"].sort(key=lambda x: x["port"])
    
    # Calculate duration
    scan_meta["duration_seconds"] = round(time.time() - start_time, 2)
    return scan_meta

def _run_socket_fallback(resolved_ip: str, ports: list, scan_meta: dict):
    """
    Orchestrate the concurrent thread pool socket scan to populate scan_meta.
    """
    max_workers = min(len(ports), 20)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(check_port_socket, resolved_ip, port): port for port in ports}
        
        for future in futures:
            try:
                res = future.result()
                scan_meta["all_ports_checked"].append(res)
                if res["status"] == "open":
                    scan_meta["open_ports"].append(res)
            except Exception:
                pass
