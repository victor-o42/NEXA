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
      const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + `/api/v1/admin/user/${encodeURIComponent(email)}/quota/`, {
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
        {/* Metric 1 */}
        <motion.div whileHover={{ scale: 1.02 }} className="glass-panel p-1.5 rounded-[2rem]">
          <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Total Users</h3>
            <p className="text-4xl font-black" style={{ color: 'var(--c-accent)' }}>{metrics?.total_users}</p>
          </div>
        </motion.div>
        
        {/* Metric 2 */}
        <motion.div whileHover={{ scale: 1.02 }} className="glass-panel p-1.5 rounded-[2rem]">
          <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Total Scans Executed</h3>
            <p className="text-4xl font-black" style={{ color: 'var(--c-accent)' }}>{metrics?.total_scans}</p>
          </div>
        </motion.div>

        {/* Metric 3 */}
        <motion.div whileHover={{ scale: 1.02 }} className="glass-panel p-1.5 rounded-[2rem]">
          <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--c-text-muted)' }}>Total AI Tokens</h3>
            <p className="text-4xl font-black" style={{ color: 'var(--c-accent)' }}>{metrics?.total_ai_tokens || 0}</p>
          </div>
        </motion.div>
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
              {/* Center Text */}
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
