import os
import json
import logging
from typing import Optional
import time
from groq import Groq
from django.conf import settings

try:
    from duckduckgo_search import DDGS
    DDG_AVAILABLE = True
except ImportError:
    DDG_AVAILABLE = False

logger = logging.getLogger(__name__)

# Engine-specific prompt tuning — each mode gets a tailored briefing so the AI
# produces the most relevant, actionable explanation for the user's actual scan.
_ENGINE_CONTEXT = {
    'port': (
        "The scan performed was a PORT DIAGNOSTIC SCAN using Nmap (or socket fallbacks). "
        "Focus your analysis on: which ports are open and what services they expose, "
        "whether any services are running outdated or unusual software versions, "
        "which ports are typically attack vectors (e.g., 22/SSH, 3389/RDP, 21/FTP), "
        "and what immediate steps the user should take to harden their network perimeter."
    ),
    'web': (
        "The scan performed was a WEB APPLICATION VULNERABILITY SCAN using the Nuclei engine. "
        "Focus your analysis on: the CVEs and misconfigurations found, their severity ratings, "
        "what each vulnerability means in plain language, and precise remediation steps the user "
        "can copy-paste or action immediately."
    ),
    'full': (
        "The scan performed was a FULL COMBINED DIAGNOSTIC covering both port-level network exposure "
        "(Nmap) and web application vulnerabilities (Nuclei). "
        "Provide a holistic security assessment: start with the most critical findings overall, "
        "connect the dots between open ports and web vulnerabilities where relevant "
        "(e.g., an exposed admin panel on an open port), and finish with a prioritized remediation checklist."
    ),
}

class GroqAnalysisService:
    """
    Handles token optimization and Groq AI inference to act as an elite security auditor.
    Automatically rotates through multiple API keys if rate-limited.
    """
    def __init__(self):
        self.clients = []
        
        # Load multiple keys separated by comma
        raw_keys = getattr(settings, 'GROQ_API_KEYS', None) or os.environ.get('GROQ_API_KEYS')
        
        # Fallback to single key if GROQ_API_KEYS is not set
        if not raw_keys:
            single_key = getattr(settings, 'GROQ_API_KEY', None) or os.environ.get('GROQ_API_KEY')
            if single_key:
                raw_keys = single_key
                
        if raw_keys:
            keys = [k.strip() for k in raw_keys.split(',') if k.strip()]
            for k in keys:
                self.clients.append(Groq(api_key=k))
        self.model_name = getattr(settings, 'GROQ_MODEL', 'llama-3.3-70b-versatile')
        self.current_client_index = 0

    def get_client(self) -> Optional[Groq]:
        if not self.clients:
            return None
        return self.clients[self.current_client_index]
        
    def rotate_client(self):
        """Rotates to the next API key in the pool."""
        if self.clients:
            self.current_client_index = (self.current_client_index + 1) % len(self.clients)
            logger.info(f"Rotated to Groq API Key #{self.current_client_index + 1}")

    def clean_scan_logs(self, scan_results: dict) -> str:
        """
        Strips out unnecessary boilerplate, closed/filtered ports, and trims JSON 
        to aggressively optimize token usage before sending to Groq.
        """
        optimized = {
            "target": scan_results.get("target"),
            "duration": scan_results.get("duration_seconds"),
            "scanners": scan_results.get("scanner_used")
        }
        
        # Optimize port findings: strictly keep only open/active ports
        active_ports = []
        for port in scan_results.get("open_ports", []):
            st = (port.get("status") or port.get("state") or "").lower()
            if st == "open":
                # Extract only essential security vectors
                active_ports.append({
                    "port": port.get("port"),
                    "protocol": port.get("protocol"),
                    "service": port.get("service"),
                    "status": "open",
                    "version": port.get("version")
                })
        
        if active_ports:
            optimized["active_ports"] = active_ports
            
        # Optimize web vulnerabilities
        vulns = scan_results.get("web_vulnerabilities", [])
        if vulns:
            optimized["web_vulnerabilities"] = vulns

        # Dump to extremely compact JSON string (no spaces/newlines) to save tokens
        return json.dumps(optimized, separators=(',', ':'))

    def analyze_vulnerabilities(self, scan_results: dict, engine: str = 'port') -> tuple[str, dict]:
        client = self.get_client()
        if not client:
            logger.warning("GROQ_API_KEYS is not set. Skipping AI analysis.")
            return (
                "AI Analysis skipped: Groq API key not configured. "
                "Your raw scan results are available below."
            ), {"prompt_tokens": 0, "completion_tokens": 0}

        try:
            # Token limit optimization
            cleaned_logs = self.clean_scan_logs(scan_results)
            engine_context = _ENGINE_CONTEXT.get(engine, _ENGINE_CONTEXT['port'])

            system_persona = (
                "You are NEXA AI, an elite, intelligent, calm, and friendly cybersecurity teammate. "
                "Your primary goal is to help users (from normal internet users to developers) understand if a target website is safe to visit, and if not, exactly why. "
                "Translate complex security findings into clear, plain-English summaries that educate and reduce fear. "
                "You must VARY your responses so you don't sound repetitive. Use light, professional personality (e.g., 'Everything looks fairly healthy here', or 'Nothing is on fire, but...'). "
                "You MUST output ONLY a valid JSON object matching this exact structure:\n"
                "{\n"
                '  "scan_status": {"target": "string", "duration": "string", "status": "string"},\n'
                '  "security_verdict": "string (MUST BE ONE OF: Appears Safe, Mostly Safe, Use Caution, or Potential Risk Detected)",\n'
                '  "verdict_explanation": "string (short, human-friendly summary answering: Is this safe to visit? Why?)",\n'
                '  "risk_overview": {"Critical": int, "High": int, "Medium": int, "Low": int, "Info": int},\n'
                '  "nexa_summary": "string (friendly teammate tone, varying your greeting/opening. NEVER claim 100% safety, say \'appears safe\')",\n'
                '  "findings": [{"title": "string", "port": "string (e.g. Port 443/tcp (HTTPS), Port 80/tcp, or https://domain:443)", "risk_level": "string", "why_it_matters": "string", "potential_impact": "string", "recommended_fix": "string"}],\n'
                '  "recommendations": ["string (practical, prioritized, actionable advice)"],\n'
                '  "technical_details": "string or object (Keep the detailed technical results here for developers)"\n'
                "}\n"
                "CRITICAL RULE 1: You MUST base your verdict exclusively on the raw scanner logs provided. "
                "If the scan logs are empty or contain 0 vulnerabilities, you MUST conclude 'Appears Safe'. "
                "CRITICAL RULE 2: For EVERY finding, you MUST specify the exact port, protocol, or endpoint location in the 'port' property (e.g., 'Port 443/tcp (HTTPS)' or 'Port 80/tcp'). "
                "Do not include any other text, markdown formatting, or code blocks outside of the JSON object."
            )

            prompt = (
                f"Context about this scan:\n{engine_context}\n\n"
                f"Raw optimized findings (JSON):\n{cleaned_logs}\n\n"
                "Please analyze the open services, flag potential security risks or outdated versions, "
                "cross-reference known vulnerability patterns, and output the structured JSON report. "
                "If you need real-time context on a specific CVE or software version, use the search_web tool before answering."
            )

            messages: list[dict] = [
                {"role": "system", "content": system_persona},
                {"role": "user", "content": prompt}
            ]

            tools = []
            if DDG_AVAILABLE:
                tools = [
                    {
                        "type": "function",
                        "function": {
                            "name": "search_web",
                            "description": "Search the internet for real-time information about CVEs, software versions, or exploits.",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "query": {
                                        "type": "string",
                                        "description": "The search query, e.g. 'CVE-2023-38408 impact' or 'Apache 2.4.49 vulnerabilities'"
                                    }
                                },
                                "required": ["query"],
                            },
                        },
                    }
                ]

            # --- Retry Logic for Multi-Key Fallback ---
            max_retries = len(self.clients) if self.clients else 1
            last_exception = None
            
            for attempt in range(max_retries):
                client = self.get_client()
                if not client:
                    break
                    
                try:
                    # Step 1: Initial call with tools
                    completion_args = {
                        "model": self.model_name,
                        "messages": messages.copy(),
                        "temperature": 0.2,
                        "max_tokens": 2048,
                    }
                    if tools:
                        completion_args["tools"] = tools
                        completion_args["tool_choice"] = "auto"
                    else:
                        completion_args["response_format"] = {"type": "json_object"}

                    completion = client.chat.completions.create(**completion_args)
                    response_message = completion.choices[0].message
                    tool_calls = response_message.tool_calls
                    
                    # Track initial usage
                    usage_dict = {
                        "prompt_tokens": completion.usage.prompt_tokens if completion.usage else 0,
                        "completion_tokens": completion.usage.completion_tokens if completion.usage else 0,
                    }

                    # Step 2: Handle tool calls if the AI decided to search
                    if tool_calls and DDG_AVAILABLE:
                        assistant_msg = {
                            "role": response_message.role or "assistant",
                            "content": response_message.content or "",
                            "tool_calls": [
                                {
                                    "id": tc.id,
                                    "type": tc.type,
                                    "function": {
                                        "name": tc.function.name,
                                        "arguments": tc.function.arguments,
                                    }
                                } for tc in tool_calls
                            ]
                        }
                        messages.append(assistant_msg)
                        for tool_call in tool_calls:
                            function_name = tool_call.function.name
                            function_args = json.loads(tool_call.function.arguments)
                            
                            if function_name == "search_web":
                                query = function_args.get("query")
                                logger.info(f"Groq requested web search: {query}")
                                try:
                                    with DDGS() as ddgs:
                                        results = ddgs.text(query, max_results=3)
                                        search_result_str = "\\n".join([f"- {r.get('title', '')}: {r.get('body', '')}" for r in results])
                                        if not search_result_str:
                                            search_result_str = "No results found."
                                except Exception as e:
                                    search_result_str = f"Search failed: {str(e)}"
                                    
                                messages.append({
                                    "tool_call_id": tool_call.id,
                                    "role": "tool",
                                    "name": function_name,
                                    "content": search_result_str,
                                })
                        
                        # Step 3: Final call to get the JSON output
                        completion = client.chat.completions.create(
                            model=self.model_name,
                            messages=messages,
                            temperature=0.2,
                            max_tokens=2048,
                            response_format={"type": "json_object"}
                        )
                        content = completion.choices[0].message.content
                        if completion.usage:
                            usage_dict["prompt_tokens"] += completion.usage.prompt_tokens
                            usage_dict["completion_tokens"] += completion.usage.completion_tokens
                            
                        return (content.strip() if content else "{}"), usage_dict

                    # If no tools were called
                    if response_message.content:
                        content = response_message.content.strip()
                        if not content.startswith("{"):
                            # Fast fallback to force JSON
                            messages.append({"role": "assistant", "content": content})
                            messages.append({"role": "user", "content": "Please output the final result ONLY as the requested JSON object."})
                            completion = client.chat.completions.create(
                                model=self.model_name,
                                messages=messages,
                                temperature=0.1,
                                max_tokens=2048,
                                response_format={"type": "json_object"}
                            )
                            content_fallback = completion.choices[0].message.content
                            if completion.usage:
                                usage_dict["prompt_tokens"] += completion.usage.prompt_tokens
                                usage_dict["completion_tokens"] += completion.usage.completion_tokens
                            return (content_fallback.strip() if content_fallback else "{}"), usage_dict
                        return content, usage_dict
                    else:
                        return "AI analysis was empty.", usage_dict
                        
                except Exception as e:
                    last_exception = e
                    if "429" in str(e) or "Too Many Requests" in str(e) or "Rate limit" in str(e):
                        logger.warning(f"Rate limit hit on API Key index {self.current_client_index}. Rotating...")
                        self.rotate_client()
                        time.sleep(1) # Small backoff before retrying
                        continue
                    else:
                        # Non-rate limit error, break out and fail
                        break
                        
            # If we exhausted retries or hit a hard error
            raise last_exception or Exception("Unknown error during Groq analysis")

        except Exception as e:
            logger.error(f"Groq AI analysis error: {str(e)}")
            # Heuristic fallback analysis using raw scan findings
            open_ports = scan_results.get('open_ports', [])
            web_vulns = scan_results.get('web_vulnerabilities', [])
            target = scan_results.get('target', 'the target host')
            
            if web_vulns or any(p.get('port') not in [80, 443] for p in open_ports):
                verdict = "Potential Risk"
                summary = f"Diagnostic scan completed on {target}. NEXA identified {len(open_ports)} active service port(s) and {len(web_vulns)} web finding(s). Review technical details for hardening recommendations."
            else:
                verdict = "Appears Safe"
                summary = f"Diagnostic scan completed on {target}. No exposed vulnerable services or critical web findings were detected."
                
            fallback_dict = {
                "scan_status": {"status": "completed"},
                "security_verdict": verdict,
                "verdict_explanation": summary,
                "nexa_summary": summary,
                "findings": open_ports or web_vulns,
                "recommendations": [
                    "Keep web application frameworks and server packages updated to the latest stable versions.",
                    "Enforce TLS/HTTPS encryption on all public endpoints.",
                    "Perform regular security scans to monitor surface changes."
                ]
            }
            return json.dumps(fallback_dict), {"prompt_tokens": 0, "completion_tokens": 0}

# Maintain the old function signature for seamless integration with orchestrator.py
def analyze_scan_results(scan_results: dict, engine: str = 'port') -> tuple[str, dict]:
    service = GroqAnalysisService()
    return service.analyze_vulnerabilities(scan_results, engine)
