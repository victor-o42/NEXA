import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Notifications() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:8000'
    : 'https://api.nexa-scan.click';

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/announcements/active/`);
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'feature':
        return (
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'alert':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        );
    }
  };

  const defaultMockItems = [
    {
      id: 'mock-1',
      announcement_type: 'feature',
      title: 'Nuclei v3.8 Dynamic CVE Engine',
      message: 'Integrated 140+ active vulnerability detection templates. Web application diagnostic scans are now significantly deeper and include port badges.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'mock-2',
      announcement_type: 'maintenance',
      title: 'Groq Multi-Key Rotator Online',
      message: 'NEXA AI analysis cluster is backed by automated multi-key rotation ensuring zero downtime and instant LLaMA 3.3 70B synthesis.',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];

  const displayList = announcements.length > 0 ? announcements : defaultMockItems;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>System Notifications</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
            Official platform broadcasts, security advisories, and feature releases.
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          {displayList.length} Active {displayList.length === 1 ? 'Notice' : 'Notices'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {displayList.map((notif, index) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="glass-panel p-1.5 rounded-[2rem] hover:-translate-y-1 transition-transform"
          >
            <div className="h-full rounded-[calc(2rem-0.375rem)] p-5 relative overflow-hidden flex flex-col justify-between" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl flex-shrink-0" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {getIcon(notif.announcement_type)}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold truncate text-sm sm:text-base" style={{ color: 'var(--c-text-primary)' }}>{notif.title}</h3>
                    <span className="text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--c-text-muted)' }}>
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    {notif.message}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--c-border)' }}>
                <span className="capitalize font-mono text-[11px] px-2 py-0.5 rounded bg-white/5" style={{ color: 'var(--c-text-muted)' }}>
                  Type: {notif.announcement_type || 'General'}
                </span>
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  Verified NEXA System 🛡️
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

