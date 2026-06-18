import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import logo from '../assets/nexa_logo.png';

// ─── Eye Icon SVGs ────────────────────────────────────────────────────────────

function EyeOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosed() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Shared AuthInput with optional password-visibility toggle ────────────────

function AuthInput({ id, type = 'text', placeholder, value, onChange, disabled, autoComplete }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;


  return (
    <div className="relative">
      <input
        id={id}
        type={resolvedType}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        autoComplete={autoComplete}
        className="w-full py-3.5 px-4 rounded-xl text-sm font-medium glass-input outline-none disabled:opacity-50"
        style={{
          caretColor: 'var(--c-accent)',
          paddingRight: isPassword ? '3rem' : '1rem',
        }}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity duration-150 hover:opacity-100 focus:outline-none"
          style={{ color: 'var(--c-text-muted)', opacity: 0.7 }}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOpen /> : <EyeClosed />}
        </button>
      )}
    </div>
  );
}

// ─── Primary gradient CTA ─────────────────────────────────────────────────────

function PrimaryButton({ id, loading, children }) {
  return (
    <motion.button
      id={id}
      type="submit"
      disabled={loading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:pointer-events-none neon-glow-box"
      style={{
        background: 'linear-gradient(135deg, var(--c-accent) 0%, #4facfe 50%, var(--c-purple) 100%)',
        color: '#0B0C10',
      }}
    >
      {loading ? (
        <>
          <div
            className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
            style={{ borderColor: 'rgba(11,12,16,0.4)', borderTopColor: 'transparent' }}
          />
          <span>Processing...</span>
        </>
      ) : children}
    </motion.button>
  );
}

// ─── Tab constants ────────────────────────────────────────────────────────────

const TABS = ['Sign In', 'Create Account'];

// ─── Main Landing Component ───────────────────────────────────────────────────

export default function Landing() {
  const [activeTab, setActiveTab]     = useState(0);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');
  const [showForgot, setShowForgot]   = useState(false);

  // Sign In
  const [signInEmail, setSignInEmail]       = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Create Account
  const [createFirstName, setCreateFirstName]       = useState('');
  const [createLastName, setCreateLastName]         = useState('');
  const [createEmail, setCreateEmail]             = useState('');
  const [createPassword, setCreatePassword]       = useState('');
  const [confirmPassword, setConfirmPassword]     = useState('');

  // Forgot password
  const [resetEmail, setResetEmail] = useState('');

  const clear = () => { setError(''); setSuccessMsg(''); };

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleSignIn = async e => {
    e.preventDefault();
    if (!signInEmail || !signInPassword) { setError('Email and password are required.'); return; }
    setIsLoading(true); clear();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: signInEmail.trim(), password: signInPassword,
    });
    if (err) setError(err.message);
    setIsLoading(false);
  };

  const handleCreateAccount = async e => {
    e.preventDefault();
    if (!createFirstName || !createLastName || !createEmail || !createPassword || !confirmPassword) {
      setError('All fields are required.'); return;
    }
    if (createPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (createPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setIsLoading(true); clear();
    const { error: err } = await supabase.auth.signUp({
      email: createEmail.trim(),
      password: createPassword,
      options: {
        data: { 
          first_name: createFirstName.trim(),
          last_name: createLastName.trim()
        },
        emailRedirectTo: window.location.origin,
      },
    });
    if (err) {
      setError(err.message);
    } else {
      setSuccessMsg('Account created! Check your inbox to confirm, then sign in.');
      setActiveTab(0);
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async e => {
    e.preventDefault();
    if (!resetEmail) { setError('Enter your email address.'); return; }
    setIsLoading(true); clear();
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) { setError(err.message); } else {
      setSuccessMsg('Recovery link sent — check your inbox.');
      setShowForgot(false);
    }
    setIsLoading(false);
  };

  const handleGoogle = async () => {
    setIsLoading(true); clear();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: window.location.origin,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (err) { setError(err.message); setIsLoading(false); }
  };

  const switchTab = idx => { setActiveTab(idx); setShowForgot(false); clear(); };

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 py-10">

      {/*
        ── Breathing ambient radial blurs ──
        Three independent Framer Motion loops at staggered timings.
        Slow enough to feel like a heartbeat, fast enough to feel alive.
        The shimmer line has been removed; color accent lives here now.
      */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: '-20%', left: '-12%',
          width: 750, height: 750,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,242,254,0.11) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
        animate={{ scale: [1, 1.14, 1], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        className="absolute pointer-events-none"
        style={{
          bottom: '-18%', right: '-12%',
          width: 820, height: 820,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(155,93,229,0.11) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 10, ease: 'easeInOut', repeat: Infinity, delay: 2 }}
      />
      <motion.div
        className="absolute pointer-events-none"
        style={{
          top: '45%', left: '58%',
          width: 420, height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,172,254,0.07) 0%, transparent 68%)',
          filter: 'blur(30px)',
          transform: 'translate(-50%, -50%)',
        }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity, delay: 4 }}
      />

      {/* ── Auth Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="glass-container rounded-3xl w-full max-w-md relative z-10 overflow-hidden"
      >
        {/* No neon line at the top — the background orbs carry the color accent */}

        <div className="p-8 md:p-10">

          {/* ── Brand header ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className="flex flex-col items-center mb-8"
          >
            <img
              src={logo}
              alt="NEXA"
              className="h-14 w-auto object-contain mb-4"
              style={{ filter: 'drop-shadow(0 0 24px rgba(0,242,254,0.55))' }}
            />
            {/* NEXA — big, gradient, standalone */}
            <h1
              className="text-4xl font-black tracking-tight text-center leading-none mb-1"
              style={{
                background: 'linear-gradient(135deg, var(--c-text-primary) 20%, var(--c-accent) 60%, var(--c-purple) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              NEXA
            </h1>
            {/* Tagline — smaller, softer, follows beneath */}
            <p
              className="text-sm font-semibold tracking-[0.18em] uppercase text-center"
              style={{ color: 'var(--c-accent-muted)' }}
            >
              Next-Gen Vulnerability Scanner
            </p>
          </motion.div>

          {/* ── Tab switcher ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
            className="relative flex rounded-2xl p-1 mb-7"
            style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-input-border)' }}
          >
            {/* Spring-animated sliding indicator */}
            <motion.div
              className="absolute top-1 bottom-1 rounded-xl"
              style={{ background: 'var(--c-opt-selected-bg)', border: '1px solid var(--c-opt-selected-border)' }}
              animate={{ left: activeTab === 0 ? '4px' : '50%', width: 'calc(50% - 4px)' }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            />
            {TABS.map((label, i) => (
              <button
                key={label}
                id={`tab-${label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => switchTab(i)}
                className="relative z-10 flex-1 py-2.5 text-xs font-semibold tracking-wide transition-colors duration-200 rounded-xl"
                style={{ color: activeTab === i ? 'var(--c-accent)' : 'var(--c-text-muted)' }}
              >
                {label}
              </button>
            ))}
          </motion.div>

          {/* ── Form area ── */}
          <AnimatePresence mode="wait">

            {/* FORGOT PASSWORD */}
            {showForgot ? (
              <motion.form
                key="forgot"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onSubmit={handleForgotPassword}
                className="space-y-4"
              >
                <p className="text-xs leading-relaxed mb-1" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  Enter your account email and we'll send a secure recovery link.
                </p>
                <AuthInput
                  id="reset-email"
                  type="email"
                  placeholder="Your email address"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
                <PrimaryButton id="send-reset-btn" loading={isLoading}>
                  Send Recovery Link
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); clear(); }}
                  className="w-full text-xs py-1.5 transition-opacity duration-200 hover:opacity-100"
                  style={{ color: 'var(--c-text-secondary)', opacity: 0.65 }}
                >
                  ← Back to Sign In
                </button>
              </motion.form>

            ) : activeTab === 0 ? (

              /* SIGN IN */
              <motion.form
                key="signin"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 18 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onSubmit={handleSignIn}
                className="space-y-4"
              >
                <AuthInput
                  id="signin-email"
                  type="email"
                  placeholder="Email address"
                  value={signInEmail}
                  onChange={e => setSignInEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
                <AuthInput
                  id="signin-password"
                  type="password"
                  placeholder="Password"
                  value={signInPassword}
                  onChange={e => setSignInPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); clear(); }}
                    className="text-xs font-medium transition-all duration-200 hover:opacity-100"
                    style={{ color: 'var(--c-accent)', opacity: 0.8 }}
                  >
                    Forgot password?
                  </button>
                </div>

                <PrimaryButton id="signin-btn" loading={isLoading}>
                  Sign In
                </PrimaryButton>
              </motion.form>

            ) : (

              /* CREATE ACCOUNT */
              <motion.form
                key="create"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onSubmit={handleCreateAccount}
                className="space-y-4"
              >
                <div className="flex gap-3">
                  <div className="flex-1">
                    <AuthInput
                      id="create-first-name"
                      type="text"
                      placeholder="First name"
                      value={createFirstName}
                      onChange={e => setCreateFirstName(e.target.value)}
                      disabled={isLoading}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="flex-1">
                    <AuthInput
                      id="create-last-name"
                      type="text"
                      placeholder="Last name"
                      value={createLastName}
                      onChange={e => setCreateLastName(e.target.value)}
                      disabled={isLoading}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <AuthInput
                  id="create-email"
                  type="email"
                  placeholder="Email address"
                  value={createEmail}
                  onChange={e => setCreateEmail(e.target.value)}
                  disabled={isLoading}
                  autoComplete="email"
                />
                <AuthInput
                  id="create-password"
                  type="password"
                  placeholder="Password (min. 8 characters)"
                  value={createPassword}
                  onChange={e => setCreatePassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {/* Confirm Password — validates match before submission */}
                <AuthInput
                  id="create-confirm-password"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {/* Inline mismatch hint — real-time, no submit needed */}
                <AnimatePresence>
                  {confirmPassword && createPassword !== confirmPassword && (
                    <motion.p
                      key="mismatch"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-[11px] font-mono -mt-1"
                      style={{ color: 'rgba(251,113,133,0.85)' }}
                    >
                      Passwords don't match yet.
                    </motion.p>
                  )}
                </AnimatePresence>

                <PrimaryButton id="create-btn" loading={isLoading}>
                  Create Secure Account
                </PrimaryButton>
              </motion.form>
            )}
          </AnimatePresence>

          {/* ── Status messages ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="p-3 rounded-xl text-xs font-mono leading-relaxed"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
                >
                  {error}
                </div>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                key="success"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="p-3 rounded-xl text-xs font-mono leading-relaxed"
                  style={{ background: 'rgba(0,242,254,0.06)', border: '1px solid rgba(0,242,254,0.2)', color: '#00F2FE' }}
                >
                  {successMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── OAuth divider + Google button ── */}
          {!showForgot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38 }}
              className="mt-7"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: 'var(--c-border-subtle)' }} />
                <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: 'var(--c-text-muted)' }}>
                  Or continue with
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--c-border-subtle)' }} />
              </div>

              <motion.button
                id="google-oauth-btn"
                type="button"
                onClick={handleGoogle}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:pointer-events-none"
                style={{
                  background: 'var(--c-icon-btn-bg)',
                  border: '1px solid var(--c-icon-btn-border)',
                  color: 'var(--c-input-color)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-surface-hover)'; e.currentTarget.style.borderColor = 'var(--c-border-accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-icon-btn-bg)'; e.currentTarget.style.borderColor = 'var(--c-icon-btn-border)'; }}
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </motion.button>
            </motion.div>
          )}

          {/* ── Fine print ── */}
          <p className="mt-7 text-center text-[10px] leading-relaxed" style={{ color: 'var(--c-text-hint)' }}>
            By continuing, you agree to NEXA's safe scanning policy.{' '}
            <span style={{ color: 'var(--c-accent-muted)' }}>No destructive payloads. Ever.</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
