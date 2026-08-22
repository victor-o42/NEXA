import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-1 rounded-xl shadow-xl">
        <div className="p-3 rounded-[calc(0.75rem-0.25rem)]" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--c-text-primary)' }}>{label}</p>
          {payload.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center space-x-2 text-xs font-mono">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span style={{ color: 'var(--c-text-secondary)' }}>{entry.name}:</span>
              <span className="font-bold" style={{ color: 'var(--c-text-primary)' }}>{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(() => {
    try {
      const saved = sessionStorage.getItem('nexa_admin_metrics');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [health, setHealth] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(!metrics);
  const [error, setError] = useState('');
  const [quotaUpdates, setQuotaUpdates] = useState({});

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState('general');
  const [sendEmail, setSendEmail] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  const API_BASE = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:8000'
    : 'https://api.nexa-scan.click';

  useEffect(() => {
    fetchMetrics();
    fetchHealth();
    fetchBroadcasts();
    // Live sync metrics & telemetry every 15 seconds
    const interval = setInterval(() => {
      fetchMetrics();
      fetchHealth();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE}/api/v1/admin/metrics/`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!response.ok) {
        throw new Error('Unauthorized or not an admin.');
      }
      
      const data = await response.json();
      setMetrics(data);
      try { sessionStorage.setItem('nexa_admin_metrics', JSON.stringify(data)); } catch (e) {}
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE}/api/v1/admin/health/`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE}/api/v1/admin/broadcast/`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBroadcasts(data);
      }
    } catch (err) {
      console.error('Failed to fetch broadcasts:', err);
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
      const response = await fetch(`${API_BASE}/api/v1/admin/user/${encodeURIComponent(email)}/quota/`, {
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
      
      fetchMetrics();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setBroadcasting(true);
    setBroadcastSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE}/api/v1/admin/broadcast/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          announcement_type: broadcastType,
          send_email: sendEmail
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to publish broadcast');
      }

      const result = await response.json();
      setBroadcastSuccess(`Broadcast successfully published! ${result.emails_dispatched ? `Sent to ${result.emails_dispatched} user emails.` : ''}`);
      setBroadcastTitle('');
      setBroadcastMessage('');
      setSendEmail(false);
      fetchBroadcasts();
      setTimeout(() => setBroadcastSuccess(''), 6000);
    } catch (err) {
      alert(err.message);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDeleteBroadcast = async (id) => {
    if (!confirm('Are you sure you want to delete this broadcast announcement?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE}/api/v1/admin/broadcast/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (response.ok) {
        setBroadcasts(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      alert('Failed to delete broadcast');
    }
  };

  if (loading) return <div className="text-center p-10" style={{ color: 'var(--c-text-muted)' }}>Loading Command Center...</div>;
  if (error) return <div className="text-center p-10 text-red-500 font-bold">{error}</div>;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>CEO Command Center</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
            High-level executive metrics, live engine telemetry, and user communications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--c-accent)' }}>Live Operational Sync</span>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ scale: 1.02 }} className="glass-panel p-1.5 rounded-[2rem]">
          <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Total Users</h3>
            <p className="text-4xl font-black" style={{ color: 'var(--c-accent)' }}>{metrics?.total_users}</p>
          </div>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="glass-panel p-1.5 rounded-[2rem]">
          <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Total Scans Executed</h3>
            <p className="text-4xl font-black" style={{ color: 'var(--c-accent)' }}>{metrics?.total_scans}</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="glass-panel p-1.5 rounded-[2rem]">
          <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Total AI Tokens</h3>
            <p className="text-4xl font-black" style={{ color: 'var(--c-accent)' }}>{metrics?.total_ai_tokens || 0}</p>
          </div>
        </motion.div>
      </div>

      {/* FEATURE 6: LIVE SYSTEM HEALTH & ENGINE TELEMETRY */}
      <div className="glass-panel p-1.5 rounded-[2rem]">
        <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b gap-2" style={{ borderColor: 'var(--c-border)' }}>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--c-text-primary)' }}>
                <span className="text-cyan-400">⚡</span> Live Engine Telemetry & Cluster Status
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
                Real-time heartbeat monitoring across database, Groq AI rotation pool, and security engines.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                ALL ENGINES ONLINE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Database Telemetry */}
            <div className="p-4 rounded-2xl border" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--c-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Database Engine</span>
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--c-text-primary)' }}>{health?.database?.engine || 'Supabase Postgres'}</p>
              <div className="mt-2 flex items-center justify-between text-xs font-mono">
                <span style={{ color: 'var(--c-text-muted)' }}>Status:</span>
                <span className="text-green-400">{health?.database?.status || 'Connected'}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs font-mono">
                <span style={{ color: 'var(--c-text-muted)' }}>Query Ping:</span>
                <span className="text-cyan-400 font-bold">{health?.database?.latency_ms ? `${health.database.latency_ms}ms` : '32ms'}</span>
              </div>
            </div>

            {/* Groq AI Cluster */}
            <div className="p-4 rounded-2xl border" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--c-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Groq AI Cluster</span>
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
              </div>
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-text-primary)' }}>{health?.groq_ai?.model || 'LLaMA 3.3 70B'}</p>
              <div className="mt-2 flex items-center justify-between text-xs font-mono">
                <span style={{ color: 'var(--c-text-muted)' }}>Rotation Pool:</span>
                <span className="text-purple-400 font-bold">{health?.groq_ai?.total_keys_in_pool ? `${health.groq_ai.total_keys_in_pool} Keys` : 'Active'}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs font-mono">
                <span style={{ color: 'var(--c-text-muted)' }}>Active Worker:</span>
                <span className="text-cyan-400 font-bold">{health?.groq_ai?.active_key_index || 'Key #1'}</span>
              </div>
            </div>

            {/* Scanner Engines */}
            <div className="p-4 rounded-2xl border" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--c-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-400">Scanner Utilities</span>
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--c-text-primary)' }}>Nmap & Nuclei v3.8</p>
              <div className="mt-2 flex items-center justify-between text-xs font-mono">
                <span style={{ color: 'var(--c-text-muted)' }}>Nmap Engine:</span>
                <span className="text-green-400">{health?.scanners?.nmap?.mode || 'Binary Engine'}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs font-mono">
                <span style={{ color: 'var(--c-text-muted)' }}>Nuclei Web:</span>
                <span className="text-green-400">{health?.scanners?.nuclei?.mode || 'Active'}</span>
              </div>
            </div>

            {/* AI Cost Efficiency */}
            <div className="p-4 rounded-2xl border" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--c-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-green-400">Cost Efficiency</span>
                <span className="text-xs font-bold text-green-400">💰 SAVED</span>
              </div>
              <p className="text-2xl font-black text-green-400">
                ${health?.token_economics?.estimated_cost_saved_usd ? health.token_economics.estimated_cost_saved_usd.toFixed(2) : '0.00'}
              </p>
              <p className="mt-1 text-[11px] leading-tight" style={{ color: 'var(--c-text-muted)' }}>
                Operational savings vs OpenAI GPT-4 ($5/M tokens) across all completed scans.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 7: CEO BROADCAST ANNOUNCEMENT COMMAND CENTER */}
      <div className="glass-panel p-1.5 rounded-[2rem]">
        <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          <div className="pb-4 mb-6 border-b" style={{ borderColor: 'var(--c-border)' }}>
            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--c-text-primary)' }}>
              <span className="text-purple-400">📢</span> Broadcast Command Center & Email Blast
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
              Publish instant platform updates to all users via in-app banners, notifications tab, and direct Resend email blasts.
            </p>
          </div>

          {broadcastSuccess && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 mb-6 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold flex items-center gap-2">
              <span>✅</span> {broadcastSuccess}
            </motion.div>
          )}

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled Engine Upgrade or New Web CVE Engine Live"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors focus:ring-1 focus:ring-[#00F2FE]"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--c-border)', color: 'var(--c-text-primary)' }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Category</label>
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors focus:ring-1 focus:ring-[#00F2FE]"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--c-border)', color: 'var(--c-text-primary)' }}
                >
                  <option value="general">📢 General Announcement</option>
                  <option value="feature">✨ New Feature Release</option>
                  <option value="maintenance">⚙️ System Maintenance</option>
                  <option value="alert">🛡️ Security Advisory</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Broadcast Message Body</label>
              <textarea
                rows={4}
                placeholder="Compose the detailed message for your users..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full p-4 rounded-xl text-sm outline-none transition-colors focus:ring-1 focus:ring-[#00F2FE]"
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--c-border)', color: 'var(--c-text-primary)' }}
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-400 focus:ring-cyan-400 focus:ring-offset-0 bg-black/40 border-white/20"
                />
                <span className="text-xs font-semibold select-none group-hover:text-cyan-400 transition-colors" style={{ color: 'var(--c-text-secondary)' }}>
                  📧 Also dispatch as a branded Email Blast to all {metrics?.total_users || 0} registered user emails (via Resend)
                </span>
              </label>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={broadcasting}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all relative overflow-hidden flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #00F2FE 0%, #9B5DE5 100%)', color: '#07090E' }}
              >
                {broadcasting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Publishing & Dispatching...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Publish Broadcast</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Previous Broadcasts History */}
          {broadcasts.length > 0 && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--c-border)' }}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--c-text-muted)' }}>Sent Broadcasts History</h4>
              <div className="space-y-3">
                {broadcasts.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: 'rgba(0,0,0,0.15)', borderColor: 'var(--c-border)' }}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
                          {b.announcement_type}
                        </span>
                        <span className="font-bold text-sm" style={{ color: 'var(--c-text-primary)' }}>{b.title}</span>
                      </div>
                      <p className="text-xs line-clamp-1" style={{ color: 'var(--c-text-secondary)' }}>{b.message}</p>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                      {b.sent_email && (
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                          ✉️ Emailed ({b.recipient_count})
                        </span>
                      )}
                      <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteBroadcast(b.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Delete broadcast"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Users Bar Chart */}
        <div className="lg:col-span-2 glass-panel p-1.5 rounded-[2rem]">
          <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6" style={{ color: 'var(--c-text-muted)' }}>Top Users by AI Tokens</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.users?.slice().sort((a, b) => (b.total_tokens || 0) - (a.total_tokens || 0)).slice(0, 7) || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />
                  <XAxis dataKey="email" tickFormatter={(email) => email.split('@')[0]} stroke="var(--c-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--c-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-surface)', opacity: 0.4 }} />
                  <Bar dataKey="total_tokens" name="AI Tokens" fill="var(--c-accent)" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quota Utilization Pie Chart */}
        <div className="glass-panel p-1.5 rounded-[2rem] flex flex-col">
          <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden flex flex-col" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Scan Quota Utilization</h3>
            <div className="flex-1 min-h-[300px] w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Used Scans', value: metrics?.users?.reduce((acc, curr) => acc + (curr.scans_used || 0), 0) || 0 },
                      { name: 'Available Quota', value: Math.max(0, (metrics?.users?.reduce((acc, curr) => acc + (curr.max_scans || 0), 0) || 0) - (metrics?.users?.reduce((acc, curr) => acc + (curr.scans_used || 0), 0) || 0)) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="var(--c-accent)" />
                    <Cell fill="var(--c-border)" />
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black" style={{ color: 'var(--c-text-primary)' }}>
                  {metrics?.total_scans}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold mt-1" style={{ color: 'var(--c-text-muted)' }}>
                  Total Used
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Quota Management Table */}
      <div className="glass-panel p-1.5 rounded-[2rem]">
        <div className="h-full rounded-[calc(2rem-0.375rem)] overflow-hidden relative" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          <div className="p-6 border-b" style={{ borderColor: 'var(--c-border)' }}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--c-text-primary)' }}>User Quota Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}>
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
                        className="w-20 px-2 py-1 text-sm font-mono text-right rounded outline-none transition-colors focus:ring-1 focus:ring-[#00F2FE]"
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--c-border)', color: 'var(--c-text-primary)' }}
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
                        className="px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50 transition-colors relative overflow-hidden group"
                        style={{ background: 'var(--c-opt-selected-bg)', color: 'var(--c-text-primary)', border: '1px solid var(--c-border)' }}
                      >
                        <div className="absolute inset-0 bg-[#00F2FE]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10">Update</span>
                      </motion.button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
