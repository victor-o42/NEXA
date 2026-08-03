import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import ScanResults from './ScanResults';
import PersonalInfo from './PersonalInfo';
import Notifications from './Notifications';
import LoginHistory from './LoginHistory';
import AdminDashboard from './AdminDashboard';
import Settings from './Settings';
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
      <svg className="w-[22px] h-[22px] text-[var(--c-accent)] drop-shadow-[0_0_12px_rgba(0,242,254,0.4)] transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" strokeDasharray="3 4" className="animate-[spin_10s_linear_infinite]" />
        <circle cx="12" cy="12" r="5" fill="var(--c-accent)" fillOpacity="0.15" />
        <path d="M12 7v10M7 12h10" strokeWidth="1" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        <path d="M19 12h3M2 12h3M12 2v3M12 19v3" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'opt-web', key: 'web',
    label: 'Web Application Vulnerability Scanner',
    description: 'Deep inspection of HTTP endpoints for misconfigs, CVEs, and exposed attack surfaces. Enter a URL or domain.',
    hoverColor: '#a855f7',
    icon: (
      <svg className="w-[22px] h-[22px] text-[#a855f7] drop-shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 8h20" strokeWidth="1.5" />
        <path d="M6 6h.01M10 6h.01" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 11l4.5 3-4.5 6-4.5-6 4.5-3z" fill="#a855f7" fillOpacity="0.2" className="animate-pulse" />
        <path d="M12 11v9" strokeOpacity="0.5" />
        <path d="M7.5 14h9" strokeOpacity="0.5" />
      </svg>
    ),
  },
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, verdict }) {
  const s = (status || '').toUpperCase();
  
  if (s === 'FAILED' || (verdict && verdict.toUpperCase().includes('ERROR'))) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest backdrop-blur-md" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', boxShadow: 'inset 0 1px 0 rgba(248,113,113,0.2)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Scan Error
      </span>
    );
  }

  if (s === 'COMPLETED' && verdict) {
    const v = verdict.toUpperCase();
    if (v.includes('SAFE') || v.includes('SECURE') || v.includes('CLEAN')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest backdrop-blur-md" style={{ background: 'rgba(74,222,128,0.05)', color: '#4ade80', boxShadow: 'inset 0 1px 0 rgba(74,222,128,0.15)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.5)' }} />
          Secure
        </span>
      );
    } else if (v.includes('CRITICAL') || v.includes('HIGH')) {
       return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest backdrop-blur-md" style={{ background: 'rgba(248,113,113,0.05)', color: '#f87171', boxShadow: 'inset 0 1px 0 rgba(248,113,113,0.15)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" style={{ boxShadow: '0 0 6px rgba(248,113,113,0.5)' }} />
          Critical Risk
        </span>
       );
    } else {
       return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest backdrop-blur-md" style={{ background: 'rgba(251,191,36,0.05)', color: '#fbbf24', boxShadow: 'inset 0 1px 0 rgba(251,191,36,0.15)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" style={{ boxShadow: '0 0 6px rgba(251,191,36,0.5)' }} />
          Potential Risk
        </span>
       );
    }
  }

  let bg, color, dotColor, label = s;
  if (s === 'COMPLETED') { bg = 'rgba(74,222,128,0.05)'; color = '#4ade80'; dotColor = '#4ade80'; label = 'COMPLETED'; }
  else if (s === 'FAILED') { bg = 'rgba(248,113,113,0.05)'; color = '#f87171'; dotColor = '#f87171'; }
  else if (s === 'BLOCKED') { bg = 'rgba(251,191,36,0.05)'; color = '#fbbf24'; dotColor = '#fbbf24'; }
  else { bg = 'rgba(0,242,254,0.05)'; color = 'var(--c-accent)'; dotColor = 'var(--c-accent)'; }
  
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest backdrop-blur-md"
      style={{ background: bg, color, boxShadow: `inset 0 1px 0 ${bg.replace('0.05', '0.15')}` }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s === 'FAILED' ? 'animate-pulse' : ''}`} style={{ backgroundColor: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
      {label}
    </span>
  );
}

// ─── Custom Glassmorphic Dropdown ─────────────────────────────────────────────

function CustomDropdown({ value, onChange, options, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 outline-none"
        style={{
          background: isOpen ? 'rgba(0,242,254,0.08)' : 'var(--c-surface-2)',
          border: `1px solid ${isOpen ? 'var(--c-accent)' : 'var(--c-border-subtle)'}`,
          color: 'var(--c-text-primary)',
          boxShadow: isOpen ? '0 0 16px rgba(0,242,254,0.15)' : 'none',
        }}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.color && (
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedOption.color, boxShadow: `0 0 6px ${selectedOption.color}` }} />
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--c-accent)]' : 'text-[var(--c-text-muted)]'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Glass Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute left-0 right-0 z-50 p-1.5 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
            style={{
              background: 'rgba(11, 12, 16, 0.94)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 254, 0.1)',
            }}
          >
            <div className="space-y-1">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left outline-none"
                    style={{
                      background: isSelected ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                      color: isSelected ? 'var(--c-accent)' : (opt.color || 'var(--c-text-primary)'),
                    }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.color && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color, boxShadow: `0 0 6px ${opt.color}` }} />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0 text-[var(--c-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ENGINE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Engines' },
  { value: 'port', label: 'Port Scanner' },
  { value: 'web', label: 'Web App Scanner' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Verdicts' },
  { value: 'secure', label: 'Secure / Clean', color: '#4ade80' },
  { value: 'critical', label: 'Critical / High Risk', color: '#f87171' },
  { value: 'completed', label: 'Completed', color: 'var(--c-accent)' },
  { value: 'failed', label: 'Failed', color: '#fbbf24' },
];

// ─── History Accordion Row ────────────────────────────────────────────────────

function HistoryRow({ record, index, onRescan }) {
  const [open, setOpen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  
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
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{ 
        border: '1px solid',
        borderColor: open ? 'var(--c-accent-dim)' : 'var(--c-border-subtle)',
        background: open ? 'var(--c-surface)' : 'var(--c-surface-2)',
        boxShadow: open ? '0 12px 40px rgba(0,0,0,0.2)' : 'none'
      }}
    >
      {/* ── Collapsed header ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 text-left transition-colors duration-200 outline-none hover:bg-white/5"
      >
        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-center">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--c-text-muted)' }}>Target</p>
            <p className="text-sm font-sans font-semibold truncate" style={{ color: 'var(--c-text-primary)' }}>{record.target}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--c-text-muted)' }}>Engine</p>
            <p className="text-xs font-mono" style={{ color: 'var(--c-text-secondary)' }}>{engineLabel}</p>
          </div>
          <div className="min-w-0 hidden sm:block">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--c-text-muted)' }}>Time</p>
            <p className="text-xs font-mono" style={{ color: 'var(--c-text-secondary)' }}>{scanDate}</p>
          </div>
          <div className="min-w-0 flex items-center">
            <StatusBadge status={record.status} verdict={verdict} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onRescan && (
            <motion.button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRescan(record.target, record.scan_type);
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all outline-none"
              style={{
                background: 'rgba(0,242,254,0.08)',
                border: '1px solid rgba(0,242,254,0.25)',
                color: 'var(--c-accent)',
              }}
              title="Rescan target"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Rescan</span>
            </motion.button>
          )}

          {/* Chevron */}
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: open ? 'rgba(0,242,254,0.1)' : 'var(--c-surface)', color: open ? 'var(--c-accent)' : 'var(--c-text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>
      </button>

      {/* ── Expanded detail panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 space-y-6">

              {/* AI Explanation / Summary */}
              {nexaSummary && (
                <div className="rounded-2xl overflow-hidden shadow-lg border mt-2" style={{ background: 'var(--c-surface-3)', border: '1px solid var(--c-border-subtle)' }}>
                  <div className="flex flex-col sm:flex-row gap-5 p-6">
                     <div className="flex-shrink-0">
                       <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden backdrop-blur-md" style={{ background: 'rgba(0,242,254,0.05)', border: '1px solid rgba(0,242,254,0.2)' }}>
                         <img src={logo} alt="NEXA" className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]" />
                       </div>
                     </div>
                     <div className="flex-1 space-y-3">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--c-border-subtle)' }}>
                         <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>NEXA Analysis Report</p>
                         {verdict && (
                           <p className="text-lg font-black tracking-tight" style={{ color: 'var(--c-text-primary)' }}>
                             {verdict}
                           </p>
                         )}
                       </div>
                       <p className="text-[13px] leading-loose font-medium" style={{ color: 'var(--c-text-secondary)' }}>
                         {nexaSummary}
                       </p>
                     </div>
                  </div>
                </div>
              )}

              {/* Raw results toggle */}
              {(openPorts.length > 0 || webVulns.length > 0) && (
                <div className="pt-2">
                  <button 
                    onClick={() => setShowRaw(!showRaw)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest outline-none transition-colors"
                    style={{ color: showRaw ? 'var(--c-accent)' : 'var(--c-text-muted)' }}
                  >
                    <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${showRaw ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                    View Raw Technical Data
                  </button>
                  
                  <AnimatePresence>
                    {showRaw && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden"
                      >
                        {/* Open Ports Bento Grid */}
                        {openPorts.length > 0 && (
                          <div className="p-5 rounded-2xl flex flex-col" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border-subtle)' }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-4 flex items-center justify-between" style={{ color: 'var(--c-text-muted)' }}>
                              <span>Open Ports</span>
                              <span className="bg-white/10 px-2 py-0.5 rounded-full">{openPorts.length}</span>
                            </p>
                            <ul className="space-y-2 flex-1">
                              {openPorts.slice(0, 8).map((p, idx) => (
                                <li key={idx} className="flex justify-between items-center text-xs font-mono p-2 rounded-lg" style={{ background: 'var(--c-surface-2)' }}>
                                  <span className="font-bold flex items-center gap-1.5" style={{ color: 'var(--c-accent)' }}>
                                    <span className="w-1 h-1 rounded-full bg-cyan-400 opacity-50" />
                                    {p.port}/{p.protocol}
                                  </span>
                                  <span className="text-right truncate max-w-[150px]" style={{ color: 'var(--c-text-secondary)' }}>
                                    {p.service} <span className="opacity-50 text-[10px] ml-1">{p.version}</span>
                                  </span>
                                </li>
                              ))}
                              {openPorts.length > 8 && (
                                <li className="text-[10px] font-mono text-center pt-2" style={{ color: 'var(--c-text-muted)' }}>+{openPorts.length - 8} more hidden</li>
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Web Vulnerabilities Bento Grid */}
                        {webVulns.length > 0 && (
                          <div className="p-5 rounded-2xl flex flex-col" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border-subtle)' }}>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-4 flex items-center justify-between" style={{ color: 'var(--c-text-muted)' }}>
                              <span>Web Findings</span>
                              <span className="bg-white/10 px-2 py-0.5 rounded-full">{webVulns.filter(v => v.template_id !== 'nuclei-offline').length}</span>
                            </p>
                            <ul className="space-y-2 flex-1">
                              {webVulns.slice(0, 5).map((v, idx) => (
                                <li key={idx} className="p-3 rounded-lg space-y-1.5" style={{ background: 'var(--c-surface-2)' }}>
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold font-mono text-[10px] truncate pr-2" style={{ color: v.severity === 'critical' || v.severity === 'high' ? '#f87171' : 'var(--c-purple)' }}>{v.template_id}</span>
                                    <span className="uppercase font-bold text-[8px] tracking-widest px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--c-text-muted)' }}>{v.severity}</span>
                                  </div>
                                  <p className="text-[11px] leading-snug" style={{ color: 'var(--c-text-secondary)' }}>{v.name}</p>
                                </li>
                              ))}
                              {webVulns.length > 5 && (
                                <li className="text-[10px] font-mono text-center pt-2" style={{ color: 'var(--c-text-muted)' }}>+{webVulns.length - 5} more hidden</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard({ session }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/').pop() || 'scanner';
  const [target, setTarget]                   = useState('');
  const [selectedScanner, setSelectedScanner] = useState('port');
  const [isScanning, setIsScanning]           = useState(false);
  const [streamMessages, setStreamMessages]   = useState([]);
  const [scanResult, setScanResultState]      = useState(() => {
    try {
      const saved = sessionStorage.getItem('nexa_latest_scan_result');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const setScanResult = useCallback((val) => {
    try {
      if (val) {
        sessionStorage.setItem('nexa_latest_scan_result', JSON.stringify(val));
      } else {
        sessionStorage.removeItem('nexa_latest_scan_result');
      }
    } catch (e) {}
    setScanResultState(val);
  }, []);

  const [connectionError, setConnectionError] = useState('');
  const [selfScanMessage, setSelfScanMessage] = useState('');

  // Real scan history fetched from Supabase
  const [scanHistory, setScanHistory]         = useState(() => {
    try {
      const saved = sessionStorage.getItem('nexa_scan_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [engineFilter, setEngineFilter]       = useState('all');
  const [statusFilter, setStatusFilter]       = useState('all');

  const [userProfile, setUserProfile]         = useState(() => {
    try {
      const saved = sessionStorage.getItem('nexa_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleRescan = useCallback((targetUrl, scanType) => {
    setTarget(targetUrl);
    setSelectedScanner(scanType === 'WEB' ? 'web' : 'port');
    navigate('/dashboard/scanner');
  }, [navigate]);

  const filteredHistory = React.useMemo(() => {
    return scanHistory.filter(record => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const targetMatch = (record.target || '').toLowerCase().includes(q);
        const engineMatch = (record.scan_type === 'WEB' ? 'web application scanner' : 'port scanner').includes(q);
        const statusMatch = (record.status || '').toLowerCase().includes(q);
        let explanationMatch = false;
        if (record.explanation) {
          try {
            const parsed = JSON.parse(record.explanation);
            explanationMatch = (parsed.nexa_summary || '').toLowerCase().includes(q) || (parsed.security_verdict || '').toLowerCase().includes(q);
          } catch (e) {
            explanationMatch = record.explanation.toLowerCase().includes(q);
          }
        }
        if (!targetMatch && !engineMatch && !statusMatch && !explanationMatch) return false;
      }

      // 2. Engine Filter
      if (engineFilter !== 'all') {
        if (engineFilter === 'port' && record.scan_type === 'WEB') return false;
        if (engineFilter === 'web' && record.scan_type !== 'WEB') return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'all') {
        const s = (record.status || '').toLowerCase();
        let verdict = '';
        if (record.explanation) {
          try {
            const parsed = JSON.parse(record.explanation);
            verdict = (parsed.security_verdict || '').toLowerCase();
          } catch (e) {}
        }

        if (statusFilter === 'completed' && s !== 'completed') return false;
        if (statusFilter === 'failed' && s !== 'failed') return false;
        if (statusFilter === 'secure' && !(verdict.includes('safe') || verdict.includes('secure') || verdict.includes('clean'))) return false;
        if (statusFilter === 'critical' && !(verdict.includes('critical') || verdict.includes('high'))) return false;
      }

      return true;
    });
  }, [scanHistory, searchQuery, engineFilter, statusFilter]);

  // Helper to ensure we never use an expired JWT token for backend requests
  const getFreshToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || session?.access_token;
  };

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
        const token = await getFreshToken();
        if (!token) return;
        const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/ping/', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
          await supabase.auth.signOut();
        }
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
    // Only show full loading state if we have no cached data yet
    setScanHistory(prev => {
      if (!prev || prev.length === 0) setHistoryLoading(true);
      return prev;
    });
    try {
      if (!session) return;
      const token = await getFreshToken();
      const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/scan-history/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setScanHistory(data);
        try { sessionStorage.setItem('nexa_scan_history', JSON.stringify(data)); } catch (e) {}
      } else {
        if (response.status === 401) {
          await supabase.auth.signOut();
        }
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
      const token = await getFreshToken();
      const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/profile/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        try { sessionStorage.setItem('nexa_user_profile', JSON.stringify(data)); } catch (e) {}
      } else if (response.status === 401) {
        await supabase.auth.signOut();
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
          navigate('/dashboard/results');
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
  }, [navigate, fetchHistory]);

  // Also reload history whenever user navigates to the history tab
  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  // ── Input Sanitization & Target Validation Helper ─────────────────────────
  const validateAndCleanTarget = (rawTarget) => {
    let cleaned = (rawTarget || '').trim();
    if (!cleaned) return '';
    
    // Normalize target formatting by extracting hostname/domain if a protocol is supplied
    try {
      if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        const parsed = new URL(cleaned);
        cleaned = parsed.origin + parsed.pathname;
      }
    } catch (e) {
      // Fallback to cleaned raw input if URL constructor throws
    }
    return cleaned.replace(/\/+$/, '');
  };

  // ── Scan trigger ──────────────────────────────────────────────────────────
  const handleStartScan = async e => {
    e.preventDefault();
    const cleanedTarget = validateAndCleanTarget(target);
    if (!cleanedTarget) {
      setConnectionError("Please specify a target domain, URL, or IP address.");
      return;
    }

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

    const token = await getFreshToken();
    const url = `${(window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click')}/api/v1/scan/stream/?target=${encodeURIComponent(cleanedTarget)}&engine=${selectedScanner}&token=${token || ''}`;
    const source = new EventSource(url);
    eventSourceRef.current = source;

    const processQueue = () => {
      if (isDisplayingRef.current || messageQueueRef.current.length === 0) return;
      
      isDisplayingRef.current = true;
      const data = messageQueueRef.current.shift();
      
      if (data.status === 'error') {
        setConnectionError(data.message);
        setIsScanning(false);
        if (eventSourceRef.current) eventSourceRef.current.close();
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
        }
        setIsScanning(false);
        if (eventSourceRef.current) eventSourceRef.current.close();
        
        // Silently pull the updated scan quota
        fetchProfile();

        // Smooth timed transition: allow user to visually digest the complete state
        setTimeout(() => {
          isDisplayingRef.current = false;
          navigate('/dashboard/results');
        }, 1600);
      } else {
        // Timed, rhythmic population (1200ms) for smooth readable stream pacing
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
      if (source) source.close();
      const hasCompleted = messageQueueRef.current.some(m => m.status === 'completed') || !isScanning;
      if (!hasCompleted) {
        if (messageQueueRef.current.length === 0) {
          setConnectionError('Diagnostic stream connection ended. Please verify your target or network.');
          setIsScanning(false);
        }
      }
    };
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 sm:space-y-5 md:space-y-6">

      {/* ── Welcome Bar (Double Bezel) ── */}
      <div className="glass-panel p-1.5 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem]">
        <div className="flex flex-wrap justify-between items-center gap-4 rounded-[calc(2rem-0.375rem)] sm:rounded-[calc(2.5rem-0.5rem)] p-5 sm:p-7 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, var(--c-accent-dim) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>
              {greeting}, {displayName}.
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
              What would you like to scan today?
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
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
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="results" element={<ScanResults scanResult={scanResult} />} />
          <Route path="profile" element={<PersonalInfo session={session} />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="login_history" element={<LoginHistory />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="scanner" replace />} />
          <Route path="scanner" element={
          <motion.div
            key="scanner-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
            className="space-y-4 sm:space-y-5"
          >
            {/* AI Scan Credit Counter (Double Bezel) */}
            <div className="glass-panel p-1.5 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem]">
              <div className="rounded-[calc(2rem-0.375rem)] sm:rounded-[calc(2.5rem-0.5rem)] p-5 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
                <div>
                  <h2 className="text-base font-bold mb-1 tracking-tight" style={{ color: 'var(--c-text-primary)' }}>Scan Credits</h2>
                  <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>Remaining scans on your plan.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--c-text-muted)' }}>REMAINING</span>
                  <div className="px-4 py-2 rounded-xl text-sm font-black shadow-inner" style={{ background: 'var(--c-surface-2)', color: 'var(--c-accent)' }}>
                    {userProfile ? (userProfile.is_admin ? 'Unlimited' : userProfile.max_scans - userProfile.scans_used) : '...'}
                  </div>
                </div>
              </div>
            </div>

            {/* Engine selector (Double Bezel) */}
            <div className="glass-panel p-1.5 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem]">
              <div className="rounded-[calc(2rem-0.375rem)] sm:rounded-[calc(2.5rem-0.5rem)] p-5 sm:p-7" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
                <h2 className="text-base font-bold mb-1 tracking-tight" style={{ color: 'var(--c-text-primary)' }}>
                  Diagnostic Engine
                </h2>
                <p className="text-xs mb-6" style={{ color: 'var(--c-text-secondary)' }}>
                  Select the type of diagnostic tool to run against the target.
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
            </div>

            <div className="flex flex-col gap-4 sm:gap-5 lg:gap-6">
              
              {/* Target input (Double Bezel) */}
              <div className="glass-panel p-1.5 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem]">
                <div className="rounded-[calc(2rem-0.375rem)] sm:rounded-[calc(2.5rem-0.5rem)] p-5 sm:p-8 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
                  <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full pointer-events-none"
                    style={{ background: 'var(--c-accent-dim)', filter: 'blur(70px)' }} />
                  
                  <h2 className="text-lg sm:text-xl font-bold mb-1 tracking-tight" style={{ color: 'var(--c-text-primary)' }}>
                    New Security Scan
                  </h2>
                  <p className="text-xs sm:text-sm mb-6 sm:mb-8" style={{ color: 'var(--c-text-secondary)' }}>
                    Enter a domain, URL, or IP address to begin diagnostics.
                  </p>
                  
                  <form onSubmit={handleStartScan} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="e.g. example.com, https://example.com"
                      value={target}
                      onChange={e => setTarget(e.target.value)}
                      disabled={isScanning}
                      className="glass-input flex-1 px-5 py-4 rounded-2xl text-sm font-mono transition-all duration-300 disabled:opacity-50"
                      style={{ caretColor: 'var(--c-accent)' }}
                    />
                    <motion.button
                      type="submit"
                      disabled={isScanning || (userProfile && !userProfile.is_admin && userProfile.scans_used >= userProfile.max_scans)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="px-8 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shadow-xl"
                      style={{
                        background: 'linear-gradient(135deg, #00F2FE 0%, #4facfe 100%)',
                        color: '#0B0C10',
                        boxShadow: '0 8px 24px rgba(0,242,254,0.3), inset 0 1px 1px rgba(255,255,255,0.4)',
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
                          <span>Trigger Diagnostic</span>
                          <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </>
                      )}
                    </motion.button>
                  </form>

                  <AnimatePresence mode="popLayout">
                    {connectionError && (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="mt-5 p-4 rounded-2xl font-mono text-xs leading-relaxed flex items-center gap-3 overflow-hidden backdrop-blur-md shadow-2xl"
                        style={{ 
                          background: 'rgba(11, 12, 16, 0.7)', 
                          border: '1px solid rgba(248,113,113,0.3)', 
                          boxShadow: 'inset 0 1px 0 rgba(248,113,113,0.2), 0 8px 32px rgba(248,113,113,0.1)',
                          color: '#f87171' 
                        }}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" style={{ boxShadow: '0 0 8px #ef4444' }} />
                        {connectionError}
                      </motion.div>
                    )}
                    {selfScanMessage && (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="mt-5 p-4 rounded-2xl font-mono text-xs leading-relaxed overflow-hidden"
                        style={{ background: 'var(--c-accent-dim)', border: '1px solid var(--c-border-accent)', color: 'var(--c-accent)' }}
                      >
                        {selfScanMessage}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Live scan stream (Double Bezel) */}
              <AnimatePresence mode="wait">
                {streamMessages.length > 0 && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="glass-panel p-1.5 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem]"
                  >
                    <div className="rounded-[calc(2rem-0.375rem)] sm:rounded-[calc(2.5rem-0.5rem)] p-5 sm:p-7 space-y-4" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
                      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--c-border-subtle)' }}>
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>Diagnostic Stream</span>
                        {isScanning && (
                          <span className="text-xs font-mono animate-pulse flex items-center gap-2" style={{ color: 'var(--c-accent)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 8px #00f2fe' }} />
                            NEXA Active
                          </span>
                        )}
                      </div>
                      <div className="space-y-3 font-mono text-xs max-h-[400px] overflow-y-auto pr-2">
                        <AnimatePresence mode="popLayout">
                          {streamMessages.map((msg, idx) => {
                            const isNotice    = msg.type === 'notice';
                            const isCompleted = msg.type === 'completed';
                            const isError     = msg.type === 'error';
                            const isOpenPort  = (msg.text || '').includes('Discovered open port');

                            return (
                              <motion.div
                                layout
                                key={idx}
                                initial={{ opacity: 0, x: -12, scale: 0.98 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                className="flex items-start gap-3 rounded-xl transition-colors duration-200"
                                style={
                                  isNotice ? {
                                    background: 'rgba(251,191,36,0.07)',
                                    border: '1px solid rgba(251,191,36,0.2)',
                                    padding: '0.75rem',
                                  } : isOpenPort ? {
                                    padding: '0.25rem 0',
                                  } : { padding: '0.25rem 0' }
                                }
                              >
                                {/* Indicator per message type */}
                                <span className="flex-shrink-0 mt-0.5" style={{
                                  color: isCompleted ? '#4ade80' : isError ? '#f87171' : isNotice ? '#fbbf24' : 'var(--c-accent)',
                                }}>
                                  {isCompleted && (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                  {isError && (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  )}
                                  {isNotice && (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="12" y1="8" x2="12" y2="12" />
                                      <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                  )}
                                  {isOpenPort && (
                                    <span className="relative flex h-2 w-2 mt-1">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" style={{ boxShadow: '0 0 8px #00f2fe' }} />
                                    </span>
                                  )}
                                  {!isCompleted && !isError && !isNotice && !isOpenPort && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                  )}
                                </span>
                                <span className={`leading-relaxed break-all ${isOpenPort ? 'font-semibold tracking-tight text-white' : ''}`} style={{
                                  color: isCompleted ? '#4ade80' : isError ? '#f87171' : isNotice ? '#fde047' : isOpenPort ? '#ffffff' : 'var(--c-text-primary)'
                                }}>
                                  {msg.text}
                                </span>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
          } />

        {/* HISTORY TAB */}
        <Route path="history" element={
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

              {/* ── Search and Filters Bar ── */}
              {scanHistory.length > 0 && (
                <div className="space-y-3 pt-2 pb-1 border-b" style={{ borderColor: 'var(--c-border-subtle)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Search Input (col-span-6) */}
                    <div className="md:col-span-6 relative flex items-center">
                      <svg className="w-4 h-4 absolute left-3.5 pointer-events-none" style={{ color: 'var(--c-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search target, engine, or diagnostic verdict..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-mono transition-all outline-none"
                        style={{
                          background: 'var(--c-surface-2)',
                          border: '1px solid var(--c-border-subtle)',
                          color: 'var(--c-text-primary)',
                        }}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 text-xs opacity-60 hover:opacity-100 outline-none"
                          style={{ color: 'var(--c-text-muted)' }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Engine Filter Dropdown (col-span-3) */}
                    <div className="md:col-span-3">
                      <CustomDropdown
                        value={engineFilter}
                        onChange={setEngineFilter}
                        options={ENGINE_FILTER_OPTIONS}
                        placeholder="All Engines"
                      />
                    </div>

                    {/* Status Filter Dropdown (col-span-3) */}
                    <div className="md:col-span-3">
                      <CustomDropdown
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={STATUS_FILTER_OPTIONS}
                        placeholder="All Verdicts"
                      />
                    </div>
                  </div>

                  {/* Filter active counter badge */}
                  {(searchQuery || engineFilter !== 'all' || statusFilter !== 'all') && (
                    <div className="flex items-center justify-between px-1 text-xs">
                      <span style={{ color: 'var(--c-text-muted)' }}>
                        Showing {filteredHistory.length} of {scanHistory.length} diagnostic sessions
                      </span>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setEngineFilter('all');
                          setStatusFilter('all');
                        }}
                        className="font-bold text-[11px] outline-none hover:underline"
                        style={{ color: 'var(--c-accent)' }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </div>
              )}

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
              ) : filteredHistory.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--c-accent)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: 'var(--c-text-muted)' }}>No matching scan records found</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setEngineFilter('all');
                      setStatusFilter('all');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all outline-none"
                    style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)', color: 'var(--c-accent)' }}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    filteredHistory.reduce((acc, record) => {
                      const d = new Date(record.created_at);
                      // Group by Local Date string
                      const dateKey = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      
                      // Pretty names for Today/Yesterday
                      const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      
                      let label = dateKey;
                      if (dateKey === today) label = 'Today';
                      else if (dateKey === yesterday) label = 'Yesterday';

                      if (!acc[label]) acc[label] = [];
                      acc[label].push(record);
                      return acc;
                    }, {})
                  ).map(([dateLabel, records]) => (
                    <div key={dateLabel} className="space-y-3">
                      {/* Date Separator */}
                      <div className="flex items-center gap-4 py-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ opacity: 0.5 }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>{dateLabel}</span>
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/10 to-transparent" style={{ opacity: 0.5 }} />
                      </div>
                      
                      {/* Records for this date */}
                      {records.map((record, i) => (
                        <HistoryRow key={record.id} record={record} index={i} onRescan={handleRescan} />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        } />
        </Routes>
      </AnimatePresence>
    </div>
  );
}
