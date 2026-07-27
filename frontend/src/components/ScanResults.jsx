import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Info, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import logo from '../assets/nexa_logo.png';

export default function ScanResults({ scanResult }) {
  const [showTechDetails, setShowTechDetails] = useState(false);

  if (!scanResult) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel p-1.5 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem]"
      >
        <div className="rounded-[calc(2rem-0.375rem)] sm:rounded-[calc(2.5rem-0.5rem)] p-8 sm:p-12 flex flex-col items-center text-center relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'var(--c-accent-dim)', border: '1px solid var(--c-border-accent)' }}>
            <Shield className="w-8 h-8" style={{ color: 'var(--c-accent)' }} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2" style={{ color: 'var(--c-text-primary)' }}>
            No Scan Result Active
          </h2>
          <p className="text-sm max-w-md mb-8" style={{ color: 'var(--c-text-secondary)' }}>
            Run a new security diagnostic from the scanner or select a previous scan from your history log to view detailed AI analysis.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/dashboard/scanner"
              className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-transform hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--c-accent) 0%, #4facfe 100%)', color: '#0B0C10' }}
            >
              Start New Scan
            </a>
            <a
              href="/dashboard/login_history"
              className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text-primary)' }}
            >
              View Log
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  const { target, status, results, explanation } = scanResult;
  const openPorts = results?.open_ports || [];
  const webVulns  = results?.web_vulnerabilities || [];

  // Parse the explanation string as JSON
  const parsedExplanation = useMemo(() => {
    if (!explanation) return null;
    try {
      return JSON.parse(explanation);
    } catch (e) {
      console.warn("Failed to parse AI explanation JSON. Falling back to raw layout.");
      return null;
    }
  }, [explanation]);

  // -------------------------------------------------------------
  // FALLBACK UI (If AI failed or returned non-JSON string)
  // -------------------------------------------------------------
  if (!parsedExplanation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-6"
      >
        <div className="glass-panel p-1.5 rounded-[2.5rem]">
          <div className="h-full rounded-[calc(2.5rem-0.375rem)] p-8 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <div className="mb-6 border-b pb-4" style={{ borderColor: 'var(--c-border-subtle)' }}>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--c-text-primary)' }}>
                Scan Complete: <span style={{ color: 'var(--c-accent)' }}>{target}</span>
              </h2>
              <p className="text-sm mt-1 uppercase font-bold" style={{ color: '#4ade80' }}>
                Status: {status}
              </p>
            </div>
            
            <div className="p-6 rounded-2xl mb-8" style={{ background: 'var(--c-accent-dim)', border: '1px solid var(--c-border-accent)' }}>
              <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--c-accent)' }}>NEXA AI Fallback</h3>
              <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>
                {explanation || "No summary available."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                <h4 className="text-sm font-bold uppercase mb-4" style={{ color: 'var(--c-text-muted)' }}>Port Diagnostics</h4>
                {openPorts.length > 0 ? (
                  <ul className="space-y-2">
                    {openPorts.map((portInfo, idx) => (
                      <li key={idx} className="flex justify-between text-xs font-mono">
                        <span className="font-bold" style={{ color: 'var(--c-accent)' }}>{portInfo.port}/{portInfo.protocol}</span>
                        <span style={{ color: 'var(--c-text-primary)' }}>{portInfo.service} ({portInfo.version})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>No open ports detected.</p>
                )}
              </div>

              <div className="p-5 rounded-2xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                <h4 className="text-sm font-bold uppercase mb-4" style={{ color: 'var(--c-text-muted)' }}>Web Vulnerabilities</h4>
                {webVulns.length > 0 ? (
                  <ul className="space-y-2">
                    {webVulns.map((vuln, idx) => (
                      <li key={idx} className="flex flex-col text-xs space-y-1 mb-2 pb-2" style={{ borderBottom: '1px solid var(--c-border-subtle)' }}>
                        <div className="flex justify-between">
                          <span className="font-bold font-mono" style={{ color: 'var(--c-purple)' }}>{vuln.template_id}</span>
                          <span className="uppercase font-semibold" style={{ color: 'var(--c-text-muted)' }}>{vuln.severity}</span>
                        </div>
                        <span style={{ color: 'var(--c-text-primary)' }}>{vuln.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>No web vulnerabilities detected.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // -------------------------------------------------------------
  // STRUCTURED JSON UI (The New Design)
  // -------------------------------------------------------------
  const {
    scan_status,
    security_verdict,
    verdict_explanation,
    risk_overview,
    nexa_summary,
    findings,
    recommendations,
    technical_details
  } = parsedExplanation;

  const getVerdictStyle = (verdict) => {
    switch (verdict) {
      case 'Appears Safe': return { color: '#4ade80', icon: <ShieldCheck size={28} color="#4ade80" />, border: 'rgba(74, 222, 128, 0.3)' };
      case 'Mostly Safe': return { color: '#fbbf24', icon: <Shield size={28} color="#fbbf24" />, border: 'rgba(251, 191, 36, 0.3)' };
      case 'Use Caution': return { color: '#f97316', icon: <AlertTriangle size={28} color="#f97316" />, border: 'rgba(249, 115, 22, 0.3)' };
      case 'Potential Risk Detected': return { color: '#ef4444', icon: <ShieldAlert size={28} color="#ef4444" />, border: 'rgba(239, 68, 68, 0.3)' };
      default: return { color: 'var(--c-accent)', icon: <Info size={28} color="var(--c-accent)" />, border: 'var(--c-border-accent)' };
    }
  };

  const verdictStyle = getVerdictStyle(security_verdict);

  const riskColors = {
    Critical: '#ef4444',
    High: '#f97316',
    Medium: '#fbbf24',
    Low: '#3b82f6',
    Info: '#9ca3af'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8 pb-12"
    >
      {/* Target Header */}
      <div className="text-center mb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>
          Diagnostic Results for
        </h2>
        <h1 className="text-2xl md:text-3xl font-bold mt-2" style={{ color: 'var(--c-text-primary)' }}>
          {scan_status?.target || target}
        </h1>
        {scan_status?.duration && (
          <p className="text-xs mt-2" style={{ color: 'var(--c-text-secondary)' }}>
            Scan completed in {scan_status.duration}
          </p>
        )}
      </div>

      {/* 1. HERO VERDICT CARD */}
      <div className="glass-panel p-1.5 rounded-[2.5rem]">
        <div 
          className="rounded-[calc(2.5rem-0.375rem)] p-6 md:p-10 flex flex-col items-center justify-center text-center w-full relative overflow-hidden" 
          style={{ background: 'var(--c-surface-inset)', boxShadow: `inset 0 2px 8px rgba(0,0,0,0.2), inset 0 0 40px ${verdictStyle.border}` }}
        >
          <div className="absolute inset-0 opacity-10 bg-gradient-to-b from-transparent to-current pointer-events-none" style={{ color: verdictStyle.color }}></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="p-4 rounded-full mb-4 shadow-sm" style={{ background: 'var(--c-surface-2)', border: `1px solid ${verdictStyle.border}` }}>
              {React.cloneElement(verdictStyle.icon, { size: 36 })}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: verdictStyle.color }}>
              {security_verdict}
            </h1>
            <p className="text-base md:text-lg font-medium max-w-2xl mx-auto" style={{ color: 'var(--c-text-secondary)' }}>
              {verdict_explanation}
            </p>
          </div>
        </div>
      </div>

      {/* 2. NEXA CHAT BUBBLE SUMMARY */}
      <div className="flex gap-4 max-w-4xl mx-auto mt-12">
        <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', border: '1px solid var(--c-accent)' }}>
          <img src={logo} alt="NEXA" className="w-7 h-7 object-contain drop-shadow-md" style={{ filter: 'drop-shadow(0 0 8px rgba(0,242,254,0.4))' }} />
        </div>
        <div className="glass-panel p-1 rounded-2xl rounded-tl-sm flex-1">
          <div className="h-full rounded-[calc(1rem-0.25rem)] rounded-tl-none p-5 md:p-6" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--c-text-muted)' }}>NEXA Analysis</h4>
            <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--c-text-primary)' }}>
              {nexa_summary}
            </p>
          </div>
        </div>
      </div>

      {/* 3. SIMPLIFIED FINDINGS LIST */}
      {findings && findings.length > 0 && (
        <div className="max-w-4xl mx-auto mt-12 space-y-6">
          <h3 className="text-xl font-bold mb-6 text-center" style={{ color: 'var(--c-text-primary)' }}>What We Found</h3>
          {findings.map((finding, idx) => (
            <div key={idx} className="glass-panel p-1.5 rounded-[2rem] hover:-translate-y-1 transition-transform">
              <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-10" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
                <div className="md:w-1/3 flex flex-col items-start border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6">
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4" style={{ background: 'rgba(0,0,0,0.2)', color: riskColors[finding.risk_level] || 'var(--c-text-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {finding.risk_level}
                  </span>
                  <h4 className="font-bold text-lg leading-snug" style={{ color: 'var(--c-text-primary)' }}>{finding.title}</h4>
                </div>
                
                <div className="md:w-2/3 space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-secondary)' }}>Why it matters</p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-hint)' }}>{finding.why_it_matters}</p>
                  </div>
                  {finding.potential_impact && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-secondary)' }}>Potential Impact</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-hint)' }}>{finding.potential_impact}</p>
                    </div>
                  )}
                  <div className="p-4 rounded-xl mt-4 border" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--c-border-subtle)' }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--c-accent)' }}>
                      <CheckCircle2 size={14} /> How to fix it
                    </p>
                    <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--c-text-primary)' }}>{finding.recommended_fix}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. ACTION ITEMS CHECKLIST */}
      {recommendations && recommendations.length > 0 && (
        <div className="max-w-4xl mx-auto mt-12">
          <div className="glass-panel p-1.5 rounded-[2rem]">
            <div className="rounded-[calc(2rem-0.375rem)] p-6 md:p-8" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
              <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--c-text-primary)' }}>Next Steps</h3>
              <ul className="space-y-4">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-white/5">
                    <div className="mt-0.5 rounded-full p-1 shadow-inner" style={{ color: 'var(--c-accent)', background: 'rgba(0,0,0,0.3)' }}>
                      <CheckCircle2 size={18} />
                    </div>
                    <span className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--c-text-primary)' }}>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 5. Technical Details (Collapsible) */}
      <div className="mt-8">
        <div className="glass-panel p-1 rounded-2xl transition-all duration-300 hover:shadow-lg">
          <button 
            onClick={() => setShowTechDetails(!showTechDetails)}
            className="w-full flex items-center justify-between p-4 rounded-[calc(1rem-0.25rem)]"
            style={{ background: 'var(--c-surface-inset)' }}
          >
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>Technical Raw Details</span>
            {showTechDetails ? <ChevronUp size={18} color="var(--c-text-muted)" /> : <ChevronDown size={18} color="var(--c-text-muted)" />}
          </button>
        </div>

        <AnimatePresence>
          {showTechDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <div className="glass-panel p-1.5 rounded-[2rem]">
                <div className="rounded-[calc(2rem-0.375rem)] p-6" style={{ background: 'rgba(0,0,0,0.4)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)' }}>
                  
                  {/* Dump AI Technical Details if provided */}
                  {technical_details && (
                    <div className="mb-6">
                      <h4 className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--c-text-muted)' }}>AI Technical Notes</h4>
                      <pre className="text-[10px] font-mono p-4 rounded-xl overflow-x-auto whitespace-pre-wrap shadow-inner" style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--c-text-secondary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {typeof technical_details === 'object' ? JSON.stringify(technical_details, null, 2) : technical_details}
                      </pre>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Raw Open Ports */}
                    {openPorts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--c-text-muted)' }}>Port Diagnostics</h4>
                        <ul className="space-y-1">
                          {openPorts.map((portInfo, idx) => (
                            <li key={idx} className="flex justify-between text-[10px] font-mono p-2 rounded shadow-inner" style={{ background: 'rgba(0,0,0,0.3)' }}>
                              <span style={{ color: 'var(--c-accent)' }}>{portInfo.port}/{portInfo.protocol}</span>
                              <span style={{ color: 'var(--c-text-secondary)' }}>{portInfo.service} ({portInfo.version})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Raw Web Vulns */}
                    {webVulns.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--c-text-muted)' }}>Web Vulnerability Data</h4>
                        <ul className="space-y-1">
                          {webVulns.map((vuln, idx) => (
                            <li key={idx} className="flex justify-between text-[10px] font-mono p-2 rounded shadow-inner" style={{ background: 'rgba(0,0,0,0.3)' }}>
                              <span style={{ color: 'var(--c-purple)' }}>{vuln.template_id}</span>
                              <span style={{ color: 'var(--c-text-secondary)' }}>{vuln.severity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}
