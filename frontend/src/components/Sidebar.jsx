import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logo from '../assets/nexa_logo.png';

// ── Icons ─────────────────────────────────────────────────────────

function SunIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function MenuIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function CloseIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    id: 'scanner',
    label: 'Security Scanner',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'Scan History',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Personal Info',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    id: 'login_history',
    label: 'Login History',
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split('/').pop() || 'scanner';

  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('nexa-theme') !== 'light'; }
    catch { return true; }
  });
  const [userProfile, setUserProfile] = useState(null);
  const [djangoProfile, setDjangoProfile] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchDjangoProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/profile/', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        setDjangoProfile(profile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserProfile(data.user);
        fetchDjangoProfile();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUserProfile(session.user);
          fetchDjangoProfile();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    isDark ? root.classList.add('dark') : root.classList.remove('dark');
    try { localStorage.setItem('nexa-theme', isDark ? 'dark' : 'light'); } catch { }
  }, [isDark]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const UserAvatar = ({ size = 10, expand = false }) => {
    const firstName = userProfile?.user_metadata?.first_name || userProfile?.user_metadata?.full_name || userProfile?.email || '?';
    const initial = firstName.charAt(0).toUpperCase();
    const avatarUrl = userProfile?.user_metadata?.custom_avatar_url || userProfile?.user_metadata?.avatar_url;

    return (
      <div className={`flex items-center gap-3 ${expand ? 'w-full' : ''}`}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}
            style={{ border: '1px solid var(--c-purple)' }}
          />
        ) : (
          <div
            className={`w-${size} h-${size} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
            style={{ background: 'var(--c-purple)' }}
          >
            {initial}
          </div>
        )}
        {expand && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold truncate" style={{ color: 'var(--c-text-primary)' }}>
              {userProfile?.user_metadata?.first_name
                ? `${userProfile.user_metadata.first_name} ${userProfile.user_metadata.last_name || ''}`
                : firstName}
            </span>
            <span className="text-xs font-mono truncate" style={{ color: 'var(--c-text-secondary)' }}>
              {userProfile?.email}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ── MOBILE LAYOUT (< md) ── */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex md:hidden glass-panel rounded-full p-2 pl-4 pr-2 items-center justify-between select-none fixed top-4 left-4 right-4 z-40"
        style={{ backdropFilter: 'blur(24px) saturate(180%)', border: '1px solid var(--c-border)' }}
      >
        {/* Logo & Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 outline-none rounded-full transition-colors"
            style={{ color: 'var(--c-text-primary)' }}
          >
            <MenuIcon size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="NEXA" className="h-6 w-auto object-contain" style={{ filter: 'drop-shadow(0 0 10px rgba(0,242,254,0.5))' }} />
            <span className="text-sm font-bold tracking-wider" style={{ color: 'var(--c-text-primary)' }}>NEXA</span>
          </div>
        </div>

        {/* Theme toggle & Profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDark(p => !p)}
            className="w-12 h-8 rounded-full outline-none flex items-center justify-center theme-toggle-pill cursor-pointer flex-shrink-0"
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.div
                  key="moon"
                  initial={{ y: -20, opacity: 0, rotate: -90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 20, opacity: 0, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <MoonIcon size={14} className="neon-moon-icon" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ y: 20, opacity: 0, rotate: 90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: -20, opacity: 0, rotate: -90 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <SunIcon size={14} className="neon-moon-icon" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          {userProfile && (
            <motion.div whileTap={{ scale: 0.95 }} onClick={() => navigate('/dashboard/profile')} className="cursor-pointer">
              <UserAvatar size={8} />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Spacer for mobile fixed header */}
      <div className="md:hidden h-16 w-full shrink-0" />

      {/* Mobile Sliding Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-50 glass-container flex flex-col p-6"
            style={{ background: 'var(--c-surface-alpha)', backdropFilter: 'blur(20px)' }}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <img src={logo} alt="NEXA" className="h-8 w-auto object-contain" />
                <span className="text-lg font-bold tracking-wider" style={{ color: 'var(--c-text-primary)' }}>NEXA</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 outline-none text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <CloseIcon size={24} />
              </button>
            </div>

            <nav className="space-y-2 mb-8 flex-1">
              {NAV_ITEMS.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={`mob-${item.id}`}
                    onClick={() => {
                      navigate(`/dashboard/${item.id}`);
                      setMobileMenuOpen(false);
                    }}
                    whileTap={{ scale: 0.96 }}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl relative text-base font-medium transition-colors outline-none"
                    style={{ color: isActive ? '#0B0C10' : 'var(--c-text-primary)' }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mobileOverlayActiveNav"
                        className="absolute inset-0 rounded-2xl -z-10"
                        style={{ background: 'linear-gradient(135deg, #00F2FE 0%, #4facfe 100%)' }}
                      />
                    )}
                    <span className="relative z-10">{item.icon}</span>
                    <span className="relative z-10">{item.label}</span>
                  </motion.button>
                );
              })}
            </nav>

            <div className="mt-auto space-y-6">
              {userProfile && (
                <div className="p-4 rounded-3xl" style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
                  <div className="flex items-center gap-3">
                    <UserAvatar size={10} expand={false} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold truncate" style={{ color: 'var(--c-text-primary)' }}>
                        {userProfile?.user_metadata?.first_name
                          ? `${userProfile.user_metadata.first_name} ${userProfile.user_metadata.last_name || ''}`
                          : userProfile?.user_metadata?.full_name || userProfile?.email?.split('@')[0]}
                      </span>
                      <span className="text-xs font-mono truncate" style={{ color: 'var(--c-text-secondary)' }}>
                        {userProfile?.email}
                      </span>
                    </div>
                  </div>

                  {(userProfile?.user_metadata?.is_admin || djangoProfile?.is_admin) && (
                    <motion.button
                      onClick={() => { navigate('/dashboard/admin'); setMobileMenuOpen(false); }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                      style={{
                        background: 'rgba(168, 85, 247, 0.1)',
                        color: '#a855f7',
                        border: '1px solid rgba(168, 85, 247, 0.2)'
                      }}
                    >
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4l-8 4v7c0 4.418 3.582 8 8 8s8-3.582 8-8V8l-8-4z" />
                      </svg>
                      Admin Console
                    </motion.button>
                  )}
                </div>
              )}
              <motion.button
                onClick={handleSignOut}
                whileTap={{ scale: 0.96 }}
                className="w-full py-4 rounded-2xl font-bold text-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)' }}
              >
                Sign Out
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DESKTOP LAYOUT (≥ md) ── */}
      <div className="hidden md:flex w-64 lg:w-72 flex-shrink-0 flex-col glass-panel rounded-[2.5rem] p-1.5 sm:p-2 select-none min-h-[calc(100vh-3rem)] sticky top-6 z-10">
        <div className="flex-1 flex flex-col rounded-[calc(2.5rem-0.5rem)] p-4 lg:p-5 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          {/* Ambient inner glow */}
          <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'var(--c-accent-dim)', filter: 'blur(60px)', opacity: 0.5 }} />

          {/* Brand and Theme Toggle */}
          <div className="flex items-center justify-between mb-8 px-1 mt-1">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="NEXA"
                className="h-9 w-auto object-contain hover:scale-105 transition-transform duration-300"
                style={{ filter: 'drop-shadow(0 0 14px rgba(0,242,254,0.55))' }}
              />
              <span className="text-lg font-bold tracking-wider" style={{ color: 'var(--c-text-primary)' }}>NEXA</span>
            </div>
            <button
              onClick={() => setIsDark(p => !p)}
              className="w-14 h-8 rounded-full outline-none flex items-center justify-center theme-toggle-pill cursor-pointer flex-shrink-0"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.div
                    key="moon"
                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <MoonIcon size={18} className="neon-moon-icon" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ y: 20, opacity: 0, rotate: 90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: -20, opacity: 0, rotate: -90 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <SunIcon size={18} className="neon-moon-icon" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1.5 mb-6">
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={`desk-${item.id}`}
                  onClick={() => navigate(`/dashboard/${item.id}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl relative text-sm font-medium transition-colors duration-150 outline-none"
                  style={{ color: isActive ? '#0B0C10' : 'var(--c-text-muted)' }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktopActiveNav"
                      className="absolute inset-0 rounded-2xl -z-10"
                      style={{
                        background: 'linear-gradient(135deg, #00F2FE 0%, #4facfe 100%)',
                        boxShadow: '0 4px 14px rgba(0,242,254,0.4), inset 0 2px 4px rgba(255,255,255,0.5)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.8 }}
                    />
                  )}
                  <span className="relative z-10">{item.icon}</span>
                  <span className="relative z-10">{item.label}</span>
                </motion.button>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* User Profile / Status Card (Double Bezel) */}
          {userProfile && (
            <div className="mt-auto p-1.5 rounded-[1.5rem] glass-panel relative z-10">
              <div className="rounded-[calc(1.5rem-0.375rem)] p-4 flex flex-col" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)' }}>
                <div className="flex items-center gap-3">
                  <UserAvatar size={10} expand={false} />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-bold truncate" style={{ color: 'var(--c-text-primary)' }}>
                      {userProfile?.user_metadata?.first_name
                        ? `${userProfile.user_metadata.first_name} ${userProfile.user_metadata.last_name || ''}`
                        : userProfile?.user_metadata?.full_name || userProfile?.email?.split('@')[0]}
                    </span>
                    <span className="text-xs font-mono truncate" style={{ color: 'var(--c-text-secondary)' }}>
                      {userProfile?.email}
                    </span>
                  </div>
                </div>

                {/* Conditional Admin Link */}
                {(userProfile?.user_metadata?.is_admin || djangoProfile?.is_admin) && (
                  <motion.button
                    onClick={() => navigate('/dashboard/admin')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-lg"
                    style={{
                      background: activeTab === 'admin' ? 'linear-gradient(135deg, #00F2FE 0%, #4facfe 100%)' : 'rgba(168, 85, 247, 0.1)',
                      color: activeTab === 'admin' ? '#0B0C10' : '#a855f7',
                      border: `1px solid ${activeTab === 'admin' ? 'transparent' : 'rgba(168, 85, 247, 0.2)'}`
                    }}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4l-8 4v7c0 4.418 3.582 8 8 8s8-3.582 8-8V8l-8-4z" />
                    </svg>
                    Admin Console
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
