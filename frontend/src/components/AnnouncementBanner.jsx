import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:8000'
    : 'https://api.nexa-scan.click';

  useEffect(() => {
    fetchActiveAnnouncement();
  }, []);

  const fetchActiveAnnouncement = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/announcements/active/`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const latest = data[0];
          const dismissedId = localStorage.getItem(`nexa_dismissed_announcement_${latest.id}`);
          if (!dismissedId) {
            setAnnouncement(latest);
          }
        }
      }
    } catch (e) {
      // Quiet fail on network hiccups
    }
  };

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem(`nexa_dismissed_announcement_${announcement.id}`, 'true');
    }
    setDismissed(true);
  };

  if (!announcement || dismissed) return null;

  const badgeColor = {
    feature: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
    maintenance: 'from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30',
    alert: 'from-red-500/20 to-rose-500/20 text-red-400 border-red-500/30',
    general: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30'
  }[announcement.announcement_type] || 'from-cyan-500/20 to-purple-500/20 text-cyan-400 border-cyan-500/30';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full mb-3 rounded-2xl p-0.5 relative overflow-hidden shadow-lg border"
        style={{
          background: 'linear-gradient(90deg, rgba(0,242,254,0.15) 0%, rgba(155,93,229,0.15) 100%)',
          borderColor: 'rgba(255,255,255,0.08)'
        }}
      >
        <div
          className="rounded-[calc(1rem-0.125rem)] px-4 py-2.5 flex items-center justify-between gap-3"
          style={{ background: 'var(--c-surface-inset)', backdropFilter: 'blur(16px)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-gradient-to-r ${badgeColor}`}>
              {announcement.announcement_type || 'Update'}
            </span>
            <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: 'var(--c-text-primary)' }}>
              <span className="font-bold text-white">{announcement.title}:</span>{' '}
              <span style={{ color: 'var(--c-text-secondary)' }}>{announcement.message}</span>
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="text-xs p-1 rounded-md hover:bg-white/10 transition-colors flex-shrink-0"
            style={{ color: 'var(--c-text-muted)' }}
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
