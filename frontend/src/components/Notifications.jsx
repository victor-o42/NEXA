import React from 'react';
import { motion } from 'framer-motion';

// Scaffolded dummy data
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'feature',
    title: 'New Nuclei Templates Added',
    message: 'We have updated our internal web vulnerability scanner with 140+ new CVE detection templates. Scans are now significantly more comprehensive.',
    date: '2 hours ago',
    icon: (
      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    )
  },
  {
    id: 2,
    type: 'system',
    title: 'Scheduled Maintenance',
    message: 'NEXA backend orchestrator will undergo standard maintenance this weekend. Port scans may experience a 30-second delay.',
    date: '1 day ago',
    icon: (
      <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    id: 3,
    type: 'alert',
    title: 'Scan Quota Reset',
    message: 'Your monthly scan limit has been successfully reset. You currently have 100 deep scans available for this billing cycle.',
    date: '3 days ago',
    icon: (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
];

export default function Notifications() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in pb-24">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>System Notifications</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
          Feature rollouts, platform news, and operational updates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {MOCK_NOTIFICATIONS.map((notif, index) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel p-1.5 rounded-[2rem] hover:-translate-y-1 transition-transform"
          >
            <div className="h-full rounded-[calc(2rem-0.375rem)] p-5 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl flex-shrink-0" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {notif.icon}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold truncate text-sm sm:text-base" style={{ color: 'var(--c-text-primary)' }}>{notif.title}</h3>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--c-text-muted)' }}>{notif.date}</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    {notif.message}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
