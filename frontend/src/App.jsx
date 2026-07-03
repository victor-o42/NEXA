import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Landing from './components/Landing';
import OfflineBanner from './components/OfflineBanner';

/**
 * Root App shell.
 * Auth gate + the global ambient orb layer that sits behind every page.
 * Moving orbs to App level means Landing, Dashboard, and loading state all
 * share the same breathing background — consistent across the entire product.
 */
function App() {
  const [session, setSession] = useState(undefined);
  const [activeTab, setActiveTab] = useState('scanner');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      
      // Dispatch login event to Django backend purely for audit/history tracking
      if (event === 'SIGNED_IN' && s) {
        // Prevent duplicate calls caused by Supabase firing SIGNED_IN on window focus
        if (!sessionStorage.getItem('login_tracked')) {
          sessionStorage.setItem('login_tracked', 'true');
          try {
            await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/login-event/', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${s.access_token}`,
                'Content-Type': 'application/json'
              }
            });
          } catch (err) {
            console.error('Login event log failed:', err);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('login_tracked');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Global ambient orb layer — renders on every page, fixed behind everything ──
  const AmbientOrbs = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Cyan — top-left */}
      <motion.div
        className="absolute rounded-full animate-orb-cyan"
        style={{
          top: '-18%', left: '-12%',
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(0,242,254,0.13) 0%, transparent 65%)',
          filter: 'blur(48px)',
        }}
        animate={{ scale: [1, 1.14, 1], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity }}
      />
      {/* Amethyst — bottom-right */}
      <motion.div
        className="absolute rounded-full animate-orb-purple"
        style={{
          bottom: '-18%', right: '-12%',
          width: 820, height: 820,
          background: 'radial-gradient(circle, rgba(155,93,229,0.12) 0%, transparent 65%)',
          filter: 'blur(56px)',
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 10, ease: 'easeInOut', repeat: Infinity, delay: 2 }}
      />
      {/* Blue accent — center-right */}
      <motion.div
        className="absolute rounded-full animate-orb-mid"
        style={{
          top: '40%', right: '20%',
          width: 380, height: 380,
          background: 'radial-gradient(circle, rgba(79,172,254,0.07) 0%, transparent 68%)',
          filter: 'blur(36px)',
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.65, 0.3] }}
        transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity, delay: 4 }}
      />
    </div>
  );

  // Loading spinner while session resolves
  if (session === undefined) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative">
        <AmbientOrbs />
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin relative z-10"
          style={{ borderColor: 'rgba(0,242,254,0.5)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // Guest — Landing page
  if (!session) {
    return (
      <div className="relative min-h-screen">
        <OfflineBanner />
        <AmbientOrbs />
        {/* Landing renders its own local orbs too — they combine nicely */}
        <div className="relative" style={{ zIndex: 1 }}>
          <Landing />
        </div>
      </div>
    );
  }

  // Authenticated — Dashboard shell
  return (
    <div className="relative min-h-screen">
      <OfflineBanner />
      <AmbientOrbs />

      {/*
        Responsive layout:
          Mobile  (< md): sidebar stacks above dashboard as a horizontal top bar
          Desktop (≥ md): sidebar left, dashboard right, side-by-side
      */}
      <div
        className="relative min-h-screen w-full p-3 sm:p-4 md:p-6 flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6"
        style={{ zIndex: 1 }}
      >
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 md:max-h-[calc(100vh-3rem)] min-w-0">
          <Dashboard
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            session={session}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
