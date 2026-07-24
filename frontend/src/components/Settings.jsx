import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Settings() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('nexa-sound-enabled');
      return saved !== 'false'; // default to true
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexa-sound-enabled', soundEnabled);
    } catch {}
  }, [soundEnabled]);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--c-text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm font-mono" style={{ color: 'var(--c-text-secondary)' }}>
          Manage your account preferences and interface behavior.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-panel p-6 rounded-[2rem] space-y-8"
      >
        <div>
          <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--c-text-primary)' }}>Interface Preferences</h2>
          
          <div className="flex items-center justify-between p-4 rounded-2xl transition-colors duration-200 hover:bg-[var(--c-surface-3)]" style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
            <div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--c-text-primary)' }}>Sidebar Sound</h3>
              <p className="text-xs font-mono" style={{ color: 'var(--c-text-secondary)' }}>Enable or disable dashboard sidebar sound effects.</p>
            </div>
            
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${soundEnabled ? 'bg-[var(--c-purple)]' : 'bg-gray-600'}`}
            >
              <motion.div
                className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                animate={{ x: soundEnabled ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
