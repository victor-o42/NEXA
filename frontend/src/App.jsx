import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Landing from './components/Landing';
import OfflineBanner from './components/OfflineBanner';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import Error404 from './components/Error404';

/**
 * Root App shell.
 * Auth gate + the global ambient orb layer that sits behind every page.
 * Moving orbs to App level means Landing, Dashboard, and loading state all
 * share the same breathing background — consistent across the entire product.
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MarketingLanding from './components/MarketingLanding';

function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      
      if (event === 'SIGNED_IN' && s) {
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

// Hardware-accelerated ambient background orbs (pure CSS GPU animation, no JS frame blocking)
const AmbientOrbs = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
    <div
      className="absolute rounded-full ambient-orb-cyan animate-orb-cyan"
      style={{
        top: '-18%', left: '-12%',
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(0,242,254,0.13) 0%, transparent 65%)',
        filter: 'blur(48px)',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform, opacity'
      }}
    />
    <div
      className="absolute rounded-full ambient-orb-purple animate-orb-purple"
      style={{
        bottom: '-18%', right: '-12%',
        width: 820, height: 820,
        background: 'radial-gradient(circle, rgba(155,93,229,0.12) 0%, transparent 65%)',
        filter: 'blur(56px)',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform, opacity'
      }}
    />
    <div
      className="absolute rounded-full ambient-orb-mid animate-orb-mid"
      style={{
        top: '40%', right: '20%',
        width: 380, height: 380,
        background: 'radial-gradient(circle, rgba(79,172,254,0.07) 0%, transparent 68%)',
        filter: 'blur(36px)',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform, opacity'
      }}
    />
  </div>
);

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

  const DashboardShell = () => (
    <div className="relative min-h-screen">
      <OfflineBanner />
      <AmbientOrbs />
      <div
        className="relative min-h-screen w-full p-3 sm:p-4 md:p-6 flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6"
        style={{ zIndex: 1 }}
      >
        <Sidebar session={session} />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 md:max-h-[calc(100vh-3rem)] min-w-0">
          <Dashboard session={session} />
        </main>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={session ? <Navigate to="/dashboard/scanner" replace /> : (
            <div className="relative min-h-screen">
              <AmbientOrbs />
              <div className="relative" style={{ zIndex: 1 }}>
                <MarketingLanding />
              </div>
            </div>
          )} 
        />
        <Route 
          path="/auth" 
          element={session ? <Navigate to="/dashboard/scanner" replace /> : (
            <div className="relative min-h-screen">
              <AmbientOrbs />
              <div className="relative" style={{ zIndex: 1 }}>
                <Landing />
              </div>
            </div>
          )} 
        />
        <Route 
          path="/privacy-policy" 
          element={
            <div className="relative min-h-screen">
              <AmbientOrbs />
              <div className="relative" style={{ zIndex: 1 }}>
                <PrivacyPolicy />
              </div>
            </div>
          } 
        />
        <Route 
          path="/terms-of-service" 
          element={
            <div className="relative min-h-screen">
              <AmbientOrbs />
              <div className="relative" style={{ zIndex: 1 }}>
                <TermsOfService />
              </div>
            </div>
          } 
        />
        <Route 
          path="/dashboard/*" 
          element={session ? <DashboardShell /> : <Navigate to="/auth" replace />} 
        />
        <Route path="*" element={<Error404 />} />
      </Routes>
    </Router>
  );
}

export default App;
