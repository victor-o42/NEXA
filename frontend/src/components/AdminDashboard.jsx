import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quotaUpdates, setQuotaUpdates] = useState({});

  useEffect(() => {
    fetchMetrics();
    // Live sync metrics every 15 seconds
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/admin/metrics/', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!response.ok) {
        throw new Error('Unauthorized or not an admin.');
      }
      
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuotaChange = (email, value) => {
    setQuotaUpdates(prev => ({ ...prev, [email]: value }));
  };

  const submitQuotaUpdate = async (email) => {
    const newQuota = quotaUpdates[email];
    if (newQuota === undefined || newQuota === '') return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`http://localhost:8000/api/v1/admin/user/${encodeURIComponent(email)}/quota/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ max_scans: parseInt(newQuota, 10) })
      });

      if (!response.ok) {
        throw new Error('Failed to update quota');
      }
      
      // Refresh metrics after update
      fetchMetrics();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center p-10" style={{ color: 'var(--c-text-muted)' }}>Loading Command Center...</div>;
  if (error) return <div className="text-center p-10 text-red-500 font-bold">{error}</div>;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in pb-24">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>CEO Command Center</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
          High-level executive metrics and user quota administration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="glass-container p-6 rounded-3xl border" style={{ borderColor: 'var(--c-border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Total Users</h3>
          <p className="text-4xl font-black" style={{ color: 'var(--c-accent)' }}>{metrics?.total_users}</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="glass-container p-6 rounded-3xl border" style={{ borderColor: 'var(--c-border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Total Scans Executed</h3>
          <p className="text-4xl font-black" style={{ color: 'var(--c-accent)' }}>{metrics?.total_scans}</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="glass-container p-6 rounded-3xl border" style={{ borderColor: 'var(--c-border)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Total AI Tokens</h3>
          <p className="text-4xl font-black" style={{ color: 'var(--c-accent)' }}>{metrics?.total_ai_tokens || 0}</p>
        </motion.div>
      </div>

      <div className="glass-container rounded-3xl overflow-hidden border" style={{ borderColor: 'var(--c-border)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--c-text-primary)' }}>User Quota Management</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)', background: 'var(--c-surface)' }}>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold text-center">AI Tokens</th>
                <th className="px-6 py-4 font-semibold text-center">Scans Used</th>
                <th className="px-6 py-4 font-semibold text-right">Max Quota</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: 'var(--c-border)' }}>
              {metrics?.users.map((u, i) => {
                // Calculate if user is online (active in the last 2 minutes)
                const isOnline = u.last_active && (new Date() - new Date(u.last_active)) < 2 * 60 * 1000;
                
                return (
                <tr key={i} className="hover:bg-white/5 dark:hover:bg-black/20 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="relative flex h-3 w-3">
                        {isOnline ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </>
                        ) : (
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500 opacity-50"></span>
                        )}
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--c-text-primary)' }}>
                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>{u.email}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      u.is_admin ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {u.is_admin ? 'Admin (CEO)' : 'Standard'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-mono text-cyan-400">{u.total_tokens?.toLocaleString() || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-mono" style={{ color: 'var(--c-text-primary)' }}>{u.scans_used}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <input 
                      type="number"
                      className="w-20 px-2 py-1 text-sm font-mono text-right rounded outline-none"
                      style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)', color: 'var(--c-input-color)' }}
                      defaultValue={u.max_scans}
                      onChange={(e) => handleQuotaChange(u.email, e.target.value)}
                      disabled={u.is_admin}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => submitQuotaUpdate(u.email)}
                      disabled={u.is_admin}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50"
                      style={{ background: 'var(--c-opt-selected-bg)', color: 'var(--c-accent)', border: '1px solid var(--c-accent)' }}
                    >
                      Update
                    </motion.button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
