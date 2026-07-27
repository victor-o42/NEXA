import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

let cachedLoginHistory = null;

export default function LoginHistory() {
  const [history, setHistory] = useState(cachedLoginHistory || []);
  const [loading, setLoading] = useState(!cachedLoginHistory);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/login-history/', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          cachedLoginHistory = data;
          setHistory(data);
        } else if (response.status === 401) {
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error("Failed to fetch login history:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in pb-24">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>Login History</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
          Audit log of your 10 most recent session connections.
        </p>
      </div>

      <div className="glass-panel p-1.5 rounded-[2rem]">
        <div className="h-full rounded-[calc(2rem-0.375rem)] overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Location / IP</th>
                  <th className="px-6 py-4 font-semibold">Device / Agent</th>
                  <th className="px-6 py-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: 'var(--c-border)' }}>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm" style={{ color: 'var(--c-text-muted)' }}>
                      Loading...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm" style={{ color: 'var(--c-text-muted)' }}>
                      No recent logins found.
                    </td>
                  </tr>
                ) : history.map((log, index) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-white/5 dark:hover:bg-black/20 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>{log.ip_address || 'Unknown IP'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap max-w-[200px] truncate" title={log.user_agent}>
                      <span className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>{log.user_agent || 'Unknown Agent'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        log.status === 'success' 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      }`}>
                        {log.status === 'success' ? 'Authorized' : 'Failed'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
