import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import ScanResults from './ScanResults';
import PersonalInfo from './PersonalInfo';
import Notifications from './Notifications';
import LoginHistory from './LoginHistory';
import AdminDashboard from './AdminDashboard';
import logo from '../assets/nexa_logo.png';

// ─── Time-based greeting ──────────────────────────────────────────────────────

// Keeping it human — greet based on their local clock.
// "Working late" hits different at 2am when you're chasing CVEs. 😄
function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Working late';
}

// ─── Scanner option card ──────────────────────────────────────────────────────

function ScannerOption({ id, label, description, icon, selected, onClick, hoverColor }) {
  const [isHovered, setIsHovered] = useState(false);
  const activeColor = hoverColor || 'var(--c-accent)';

  return (
    <motion.button
      id={id}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className="flex items-start gap-4 w-full p-4 rounded-2xl text-left transition-all duration-200"
      style={{
        background: selected ? 'var(--c-opt-selected-bg)' : (isHovered ? 'var(--c-surface-2)' : 'var(--c-opt-unselected-bg)'),
        border: `1px solid ${selected ? activeColor : (isHovered ? activeColor : 'var(--c-opt-unselected-border)')}`,
        boxShadow: selected ? `0 0 18px ${activeColor}40` : (isHovered ? `0 0 10px ${activeColor}20` : 'none'),
      }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200"
        style={{
          background: selected ? 'var(--c-opt-selected-icon)' : 'var(--c-surface)',
          border: `1px solid ${selected ? activeColor : (isHovered ? activeColor : 'var(--c-border)')}`,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold transition-colors duration-200" style={{ color: selected ? activeColor : 'var(--c-text-primary)' }}>
          {label}
        </p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
          {description}
        </p>
      </div>
      <div
        className="flex-shrink-0 w-4 h-4 rounded-full mt-0.5 transition-all duration-200"
        style={{
          border: selected ? `4px solid ${activeColor}` : `1.5px solid ${isHovered ? activeColor : 'var(--c-text-muted)'}`,
          boxShadow: selected ? `0 0 8px ${activeColor}80` : 'none',
        }}
      />
    </motion.button>
  );
}

// ─── Scanner engine definitions ───────────────────────────────────────────────

const SCANNER_OPTIONS = [
  {
    id: 'opt-port', key: 'port',
    label: 'Port Scanning Engine',
    description: 'Non-destructive TCP/UDP diagnostics across the top 100 most critical service ports. Enter a domain or IP.',
    hoverColor: 'var(--c-accent)',
    icon: (
      <svg className="w-5 h-5" style={{ color: 'var(--c-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
  },
  {
    id: 'opt-web', key: 'web',
    label: 'Web Application Vulnerability Scanner',
    description: 'Deep inspection of HTTP endpoints for misconfigs, CVEs, and exposed attack surfaces. Enter a URL or domain.',
    hoverColor: 'var(--c-accent)',
    icon: (
      <svg className="w-5 h-5" style={{ color: 'var(--c-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, verdict }) {
  const s = (status || '').toUpperCase();
  
  if (s === 'COMPLETED' && verdict) {
    const v = verdict.toUpperCase();
    if (v.includes('SAFE') || v.includes('SECURE') || v.includes('CLEAN')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
          Secure
        </span>
      );
    } else if (v.includes('CRITICAL') || v.includes('HIGH')) {
       return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
          Critical Risk
        </span>
       );
    } else {
       return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
          Potential Risk
        </span>
       );
    }
  }

  let bg, color, border, label = s;
  if (s === 'COMPLETED') { bg = 'rgba(74,222,128,0.12)'; color = '#4ade80'; border = 'rgba(74,222,128,0.25)'; label = 'COMPLETED'; }
  else if (s === 'FAILED') { bg = 'rgba(248,113,113,0.12)'; color = '#f87171'; border = 'rgba(248,113,113,0.25)'; }
  else if (s === 'BLOCKED') { bg = 'rgba(251,191,36,0.12)'; color = '#fbbf24'; border = 'rgba(251,191,36,0.25)'; }
  else { bg = 'rgba(0,242,254,0.08)'; color = 'var(--c-accent)'; border = 'rgba(0,242,254,0.2)'; }
  
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  );
}

// ─── History Accordion Row ────────────────────────────────────────────────────

function HistoryRow({ record, index }) {
  const [open, setOpen] = useState(false);
  const openPorts = record.results?.open_ports || [];
  const webVulns  = record.results?.web_vulnerabilities || [];
  const scanDate  = new Date(record.created_at).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const engineLabel = record.scan_type === 'WEB'
    ? 'Web App Scanner'
    : 'Port Scanner';

  const parsedExplanation = React.useMemo(() => {
    if (!record.explanation) return null;
    try {
      return JSON.parse(record.explanation);
    } catch (e) {
      return null;
    }
  }, [record.explanation]);

  const nexaSummary = parsedExplanation?.nexa_summary || record.explanation;
  const verdict = parsedExplanation?.security_verdict || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ border: '1px solid var(--c-border-subtle)', background: 'var(--c-surface-2)' }}
    >
      {/* ── Collapsed header (always visible) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 p-4 text-left transition-colors duration-150 outline-none"
        style={{ background: open ? 'var(--c-opt-selected-bg)' : 'transparent' }}
      >
        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>Target</p>
            <p className="text-sm font-mono font-semibold truncate" style={{ color: 'var(--c-text-primary)' }}>{record.target}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>Engine</p>
            <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>{engineLabel}</p>
          </div>
          <div className="min-w-0 hidden sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>Time</p>
            <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>{scanDate}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--c-text-muted)' }}>Status</p>
            <StatusBadge status={record.status} verdict={verdict} />
          </div>
        </div>
        {/* Chevron */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
          style={{ color: 'var(--c-text-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      {/* ── Expanded detail panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--c-border-subtle)' }}>

              {/* AI Explanation / Summary */}
              {nexaSummary && (
                <div className="mt-4 p-5 rounded-2xl shadow-sm" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border-subtle)' }}>
                  <div className="flex items-center gap-3 mb-3">
                     <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm relative overflow-hidden" style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-accent)' }}>
                       <img src={logo} alt="NEXA" className="w-5 h-5 object-contain" style={{ filter: 'drop-shadow(0 0 5px rgba(0,242,254,0.4))' }} />
                     </div>
                     <div>
                       <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>NEXA Analysis</p>
                       {verdict && <p className="text-sm font-bold" style={{ color: 'var(--c-text-primary)' }}>Verdict: {verdict}</p>}
                     </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    {nexaSummary}
                  </p>
                </div>
              )}

              {/* Raw results hidden behind a native detail/summary dropdown */}
              {(openPorts.length > 0 || webVulns.length > 0) && (
                <details className="mt-4 group">
                  <summary className="text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none p-3 rounded-xl transition-colors hover:bg-white/5 outline-none" style={{ color: 'var(--c-text-muted)', border: '1px solid var(--c-border-subtle)', background: 'var(--c-surface)' }}>
                    View Raw Technical Details
                  </summary>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Open Ports */}
                    {openPorts.length > 0 && (
                      <div className="p-4 rounded-xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--c-text-muted)' }}>
                          Open Ports ({openPorts.length})
                        </p>
                        <ul className="space-y-1.5">
                          {openPorts.slice(0, 8).map((p, idx) => (
                            <li key={idx} className="flex justify-between items-center text-xs font-mono">
                              <span className="font-bold" style={{ color: 'var(--c-accent)' }}>{p.port}/{p.protocol}</span>
                              <span style={{ color: 'var(--c-text-secondary)' }}>{p.service}</span>
                              <span className="truncate max-w-[100px]" style={{ color: 'var(--c-text-muted)' }}>{p.version}</span>
                            </li>
                          ))}
                          {openPorts.length > 8 && (
                            <li className="text-xs" style={{ color: 'var(--c-text-muted)' }}>+{openPorts.length - 8} more…</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Web Vulnerabilities */}
                    {webVulns.length > 0 && (
                      <div className="p-4 rounded-xl" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--c-text-muted)' }}>
                          Web Findings ({webVulns.filter(v => v.template_id !== 'nuclei-offline').length})
                        </p>
                        <ul className="space-y-2">
                          {webVulns.slice(0, 5).map((v, idx) => (
                            <li key={idx} className="text-xs space-y-0.5">
                              <div className="flex justify-between">
                                <span className="font-bold font-mono" style={{ color: v.severity === 'critical' || v.severity === 'high' ? '#f87171' : 'var(--c-purple)' }}>{v.template_id}</span>
                                <span className="uppercase font-semibold text-[10px]" style={{ color: 'var(--c-text-muted)' }}>{v.severity}</span>
                              </div>
                              <p style={{ color: 'var(--c-text-secondary)' }}>{v.name}</p>
                            </li>
                          ))}
                          {webVulns.length > 5 && (
                            <li className="text-xs" style={{ color: 'var(--c-text-muted)' }}>+{webVulns.length - 5} more…</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard({ activeTab, setActiveTab, session }) {
  const [target, setTarget]                   = useState('');
  const [selectedScanner, setSelectedScanner] = useState('port');
  const [isScanning, setIsScanning]           = useState(false);
  const [streamMessages, setStreamMessages]   = useState([]);
  const [scanResult, setScanResult]           = useState(null);
  const [connectionError, setConnectionError] = useState('');
  const [selfScanMessage, setSelfScanMessage] = useState('');

  // Real scan history fetched from Supabase
  const [scanHistory, setScanHistory]         = useState([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [userProfile, setUserProfile]         = useState(null);

  const greeting     = getTimeGreeting();
  const displayName  = session?.user?.user_metadata?.first_name
    ? session.user.user_metadata.first_name
    : session?.user?.user_metadata?.full_name
    ? session.user.user_metadata.full_name.split(' ')[0]
    : session?.user?.email
    ? session.user.email.split('@')[0]
    : 'Operator';

  const eventSourceRef = useRef(null);
  const messageQueueRef = useRef([]);
  const isDisplayingRef = useRef(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamMessages]);

  // ── Heartbeat Ping for Accurate Online Status ──────────────────────────────
  useEffect(() => {
    if (!session) return;
    const pingServer = async () => {
      try {
        await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/ping/', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
      } catch (err) {
        // Silently fail if ping fails
      }
    };
    
    // Initial ping on load
    pingServer();
    
    // Ping every 60 seconds
    const intervalId = setInterval(pingServer, 60000);
    return () => clearInterval(intervalId);
  }, [session]);

  // ── Load real scan history from Supabase ──────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      if (!session) return;
      const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/scan-history/', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setScanHistory(data);
      } else {
        console.error('Failed to fetch scan history', response.status);
      }
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [session]);

  const fetchProfile = useCallback(async () => {
    try {
      if (!session) return;
      const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/profile/', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  }, [session]);

  useEffect(() => {
    // Listen for real-time DB updates and auto-refresh history
    const channel = supabase
      .channel('public:core_scanhistory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'core_scanhistory' }, payload => {
        const row = payload.new;
        if (row?.status === 'COMPLETED') {
          setScanResult(row);
          if (setActiveTab) setActiveTab('results');
          setIsScanning(false);
          // Refresh history and profile to include the new record and updated quota
          fetchHistory();
          fetchProfile();
        }
      })
      .subscribe();

    // Fetch history on mount
    fetchHistory();
    fetchProfile();

    return () => {
      supabase.removeChannel(channel);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [setActiveTab, fetchHistory]);

  // Also reload history whenever user navigates to the history tab
  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  // ── Scan trigger ──────────────────────────────────────────────────────────
  const handleStartScan = async e => {
    e.preventDefault();
    if (!target.trim()) return;

    if (userProfile && !userProfile.is_admin && userProfile.scans_used >= userProfile.max_scans) {
      setConnectionError("Scan quota exceeded. Please upgrade your plan or contact support.");
      return;
    }

    setIsScanning(true);
    setStreamMessages([]);
    setScanResult(null);
    setSelfScanMessage('');
    setConnectionError('');
    messageQueueRef.current = [];
    isDisplayingRef.current = false;
    if (eventSourceRef.current) eventSourceRef.current.close();

    const url = `${(window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click')}/api/v1/scan/stream/?target=${encodeURIComponent(target.trim())}&engine=${selectedScanner}&token=${session?.access_token || ''}`;
    const source = new EventSource(url);
    eventSourceRef.current = source;

    const processQueue = () => {
      if (isDisplayingRef.current || messageQueueRef.current.length === 0) return;
      
      isDisplayingRef.current = true;
      const data = messageQueueRef.current.shift();
      
      if (data.status === 'error') {
        setConnectionError(data.message);
        setIsScanning(false);
        source.close();
        isDisplayingRef.current = false;
        return;
      }

      setStreamMessages(prev => [...prev, { text: data.message, type: data.status }]);

      if (data.status === 'completed') {
        if (data.scan_results) {
          setScanResult({
            target:      data.scan_results.target || target.trim(),
            status:      'COMPLETED',
            results:     data.scan_results,
            explanation: data.ai_summary || '',
          });
          if (setActiveTab) setTimeout(() => setActiveTab('results'), 1200); // small delay to let user see "completed" state before jumping
        }
        setIsScanning(false);
        source.close();
        isDisplayingRef.current = false;
        
        // Silently pull the new scan quota so the top-left UI reflects the increment
        fetchProfile();
      } else {
        // Wait artificially before showing the next message to give it that 'timely' feeling
        setTimeout(() => {
          isDisplayingRef.current = false;
          processQueue();
        }, 1200);
      }
    };

    source.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        messageQueueRef.current.push(data);
        processQueue();
      } catch (err) {
        console.error('SSE parse error', err);
      }
    };

    source.onerror = () => {
      // If the backend naturally closes the stream because it finished fast, 
      // but our artificial frontend delay hasn't processed 'completed' yet, ignore the error!
      const hasCompleted = messageQueueRef.current.some(m => m.status === 'completed') || !isScanning;
      if (!hasCompleted) {
        setConnectionError('Connection to NEXA diagnostic stream lost. Is the backend running?');
        setIsScanning(false);
      }
      source.close();
    };
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 sm:space-y-5 md:space-y-6">

      {/* ── Welcome Bar ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 glass-container rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--c-accent-dim) 0%, transparent 70%)' }} />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>
            {greeting}, {displayName}.
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
            Your threat intelligence dashboard is standing by.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl"
            style={{ background: 'var(--c-badge-bg)', border: '1px solid var(--c-badge-border)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--c-accent)', boxShadow: '0 0 8px var(--c-accent)' }} />
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--c-accent)' }}>
              System Secured
            </span>
          </div>
          <motion.button
            id="signout-btn"
            onClick={() => supabase.auth.signOut()}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-10 h-10 rounded-full flex items-center justify-center outline-none"
            style={{ background: 'var(--c-icon-btn-bg)', border: '1px solid var(--c-icon-btn-border)' }}
            aria-label="Sign out" title="Sign out"
          >
            <svg className="w-4 h-4" style={{ color: 'var(--c-icon-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">

        {activeTab === 'results' && <ScanResults scanResult={scanResult} />}
        {activeTab === 'profile' && <PersonalInfo session={session} />}
        {activeTab === 'notifications' && <Notifications />}
        {activeTab === 'login_history' && <LoginHistory />}
        {activeTab === 'admin' && <AdminDashboard />}

        {/* SCANNER TAB */}
        {activeTab === 'scanner' && (
          <motion.div
            key="scanner-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4 sm:space-y-5"
          >
            {/* AI Scan Credit Counter */}
            <div className="glass-container rounded-2xl sm:rounded-3xl p-5 sm:p-7 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--c-text-primary)' }}>NEXA Scan Credits</h2>
                <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>Remaining scans available on your current plan.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tracking-wider" style={{ color: 'var(--c-text-muted)' }}>REMAINING:</span>
                <div className="px-4 py-2 rounded-xl text-lg font-black" style={{ background: 'var(--c-surface-2)', color: 'var(--c-accent)' }}>
                  {userProfile ? (userProfile.is_admin ? 'Unlimited' : userProfile.max_scans - userProfile.scans_used) : '...'}
                </div>
              </div>
            </div>

            {/* Engine selector */}
            <div className="glass-container rounded-2xl sm:rounded-3xl p-5 sm:p-7">
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--c-text-primary)' }}>
                Select Diagnostic Engine
              </h2>
              <p className="text-xs mb-5" style={{ color: 'var(--c-text-secondary)' }}>
                Choose the NEXA scanner module that fits your target.
              </p>
              <div className="space-y-3">
                {SCANNER_OPTIONS.map(opt => (
                  <ScannerOption
                    key={opt.key}
                    id={opt.id}
                    label={opt.label}
                    description={opt.description}
                    icon={opt.icon}
                    hoverColor={opt.hoverColor}
                    selected={selectedScanner === opt.key}
                    onClick={() => setSelectedScanner(opt.key)}
                  />
                ))}
              </div>
            </div>

            {/* Target input */}
            <div className="glass-container rounded-2xl sm:rounded-3xl p-5 sm:p-7 relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: 'var(--c-accent-dim)', filter: 'blur(60px)' }} />
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--c-text-primary)' }}>
                New Security Scan
              </h2>
              <p className="text-xs mb-5" style={{ color: 'var(--c-text-secondary)' }}>
                Enter a domain, URL, or IP address.
              </p>
              <form onSubmit={handleStartScan} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g. example.com, https://example.com, or 192.168.1.1"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  disabled={isScanning}
                  className="flex-1 px-5 py-4 rounded-2xl text-sm font-mono outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'var(--c-input-bg)',
                    border: '1px solid var(--c-input-border)',
                    color: 'var(--c-input-color)',
                    caretColor: 'var(--c-accent)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--c-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--c-accent-dim)'; }}
                  onBlur={e  => { e.target.style.borderColor = 'var(--c-input-border)'; e.target.style.boxShadow = 'none'; }}
                />
                <motion.button
                  type="submit"
                  disabled={isScanning || (userProfile && !userProfile.is_admin && userProfile.scans_used >= userProfile.max_scans)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="px-7 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, #00F2FE 0%, #4facfe 100%)',
                    color: '#0B0C10',
                    boxShadow: '0 0 24px rgba(0,242,254,0.25)',
                  }}
                >
                  {isScanning ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: 'rgba(11,12,16,0.4)', borderTopColor: 'transparent' }} />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Trigger Diagnostic</span>
                    </>
                  )}
                </motion.button>
              </form>

              <AnimatePresence>
                {connectionError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-5 p-4 rounded-2xl font-mono text-xs leading-relaxed overflow-hidden"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                  >
                    {connectionError}
                  </motion.div>
                )}
                {selfScanMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-5 p-4 rounded-2xl font-mono text-xs leading-relaxed overflow-hidden"
                    style={{ background: 'var(--c-accent-dim)', border: '1px solid var(--c-border-accent)', color: 'var(--c-accent)' }}
                  >
                    {selfScanMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Live scan stream */}
            <AnimatePresence>
              {streamMessages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                  className="glass-container rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4"
                >
                  <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--c-border-subtle)' }}>
                    <span className="text-sm font-semibold" style={{ color: 'var(--c-text-primary)' }}>Live Diagnostic Stream</span>
                    {isScanning && (
                      <span className="text-xs font-mono animate-pulse" style={{ color: 'var(--c-accent)' }}>NEXA Active</span>
                    )}
                  </div>
                  <div className="space-y-3 font-mono text-xs max-h-[400px] overflow-y-auto pr-2">
                    <AnimatePresence>
                      {streamMessages.map((msg, idx) => {
                        const isNotice    = msg.type === 'notice';
                        const isCompleted = msg.type === 'completed';
                        const isError     = msg.type === 'error';
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                            className="flex items-start gap-3"
                            style={isNotice ? {
                              background: 'rgba(251,191,36,0.07)',
                              border: '1px solid rgba(251,191,36,0.2)',
                              borderRadius: '0.75rem', padding: '0.75rem',
                            } : {}}
                          >
                            {/* Premium SVG icon per message type */}
                            <span className="flex-shrink-0 mt-0.5" style={{
                              color: isCompleted ? '#4ade80' : isError ? '#f87171' : isNotice ? '#fbbf24' : 'var(--c-accent)',
                            }}>
                              {isCompleted && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                              {isError && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="15" y1="9" x2="9" y2="15" />
                                  <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                              )}
                              {isNotice && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                              )}
                              {!isCompleted && !isError && !isNotice && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              )}
                            </span>
                            <span style={{
                              color: isCompleted ? '#4ade80' : isError ? '#f87171' : isNotice ? '#fbbf24' : 'var(--c-text-secondary)',
                              lineHeight: 1.6,
                            }}>
                              {msg.text}
                            </span>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={logsEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <motion.div
            key="history-view"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="glass-container rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold" style={{ color: 'var(--c-text-primary)' }}>
                    Diagnostic History
                  </h2>
                  <p className="text-xs mt-1" style={{ color: 'var(--c-text-secondary)' }}>
                    All NEXA diagnostic sessions for this account. Click any row to expand.
                  </p>
                </div>
                <motion.button
                  onClick={fetchHistory}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  disabled={historyLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold outline-none disabled:opacity-50"
                  style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-text-secondary)' }}
                >
                  <svg className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </motion.button>
              </div>

              {historyLoading && scanHistory.length === 0 ? (
                <div className="py-12 flex items-center justify-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
                  <span className="text-sm" style={{ color: 'var(--c-text-muted)' }}>Loading history...</span>
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--c-accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: 'var(--c-text-muted)' }}>No scans yet</p>
                  <p className="text-xs text-center max-w-xs" style={{ color: 'var(--c-text-hint)' }}>
                    Run your first diagnostic from the Scanner tab. Each completed scan will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scanHistory.map((record, i) => (
                    <HistoryRow key={record.id} record={record} index={i} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
