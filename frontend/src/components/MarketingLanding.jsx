import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../assets/nexa_logo.png';

// ─── Feature card data ────────────────────────────────────────────────────────

const FEATURES = [
  {
    title: 'Conversational AI',
    description: 'NEXA translates raw vulnerability payloads into actionable plain English, providing custom remediation scripts tailored to your architecture.',
    accentColor: 'var(--c-accent)',
    accentDim: 'var(--c-accent-dim)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Port Scanning',
    description: 'Non-destructive TCP/UDP diagnostics across the top 100 most critical service ports with real-time streaming results.',
    accentColor: 'var(--c-accent)',
    accentDim: 'var(--c-accent-dim)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Nuclei Core',
    description: 'Industry-standard YAML-based web vulnerability scanning engine running seamlessly against your HTTP endpoints.',
    accentColor: 'var(--c-purple)',
    accentDim: 'var(--c-purple-dim)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Streaming',
    description: 'Watch your scan results populate live as NEXA discovers findings — no waiting for a full report to drop.',
    accentColor: 'var(--c-purple)',
    accentDim: 'var(--c-purple-dim)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

// ─── Stat items ───────────────────────────────────────────────────────────────

const STATS = [
  { value: '<50ms', label: 'Avg Response Time' },
  { value: '100+', label: 'Port Diagnostics' },
  { value: '24/7', label: 'AI Monitoring' },
];

// ─── FeatureCard — uses the exact same glass-panel + double-bezel from Sidebar ─

function FeatureCard({ feature, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel rounded-[2rem] p-1.5 group"
    >
      <div
        className="rounded-[calc(2rem-0.375rem)] p-7 lg:p-8 relative overflow-hidden h-full flex flex-col"
        style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.18)' }}
      >
        {/* Ambient inner glow — mirrors the Sidebar pattern */}
        <div
          className="absolute -right-16 -top-16 w-48 h-48 rounded-full pointer-events-none transition-opacity duration-700 opacity-30 group-hover:opacity-60"
          style={{ background: feature.accentDim, filter: 'blur(50px)' }}
        />

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-6 relative z-10 transition-all duration-300"
          style={{
            background: feature.accentDim,
            border: `1px solid ${feature.accentColor}`,
            color: feature.accentColor,
            boxShadow: `0 0 12px ${feature.accentDim}`,
          }}
        >
          {feature.icon}
        </div>

        <h3
          className="text-xl font-display font-bold tracking-tight mb-3 relative z-10"
          style={{ color: 'var(--c-text-primary)' }}
        >
          {feature.title}
        </h3>
        <p
          className="text-sm leading-relaxed relative z-10"
          style={{ color: 'var(--c-text-secondary)' }}
        >
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main MarketingLanding Component ──────────────────────────────────────────

export default function MarketingLanding() {

  // SEO injection — same approach as the Auth page
  useEffect(() => {
    document.title = 'NEXA | AI-Powered Vulnerability Scanner';

    const setMeta = (name, content, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setMeta('description', 'NEXA provides autonomous, AI-driven network vulnerability scanning with real-time remediation guidance.');
    setMeta('og:title', 'NEXA | AI-Powered Vulnerability Scanner', true);
    setMeta('og:description', 'Autonomous vulnerability scanning with real-time AI remediation.', true);
    setMeta('og:type', 'website', true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', 'NEXA — Next-Gen Vulnerability Scanner');
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col">

      {/*
        ── Breathing ambient orbs ──
        Exact same pattern as Landing.jsx (Auth screen).
        Three Framer Motion loops at staggered timings — the heartbeat of NEXA.
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

      {/* ── Navigation ── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-full max-w-6xl mx-auto px-6 lg:px-10 py-8 flex justify-between items-center relative z-50"
      >
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="NEXA"
            className="h-9 w-auto object-contain"
            style={{ filter: 'drop-shadow(0 0 14px rgba(0,242,254,0.55))' }}
          />
          <span
            className="text-lg font-display font-bold tracking-wider"
            style={{ color: 'var(--c-text-primary)' }}
          >
            NEXA
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {['About', 'Pricing', 'Documentation'].map(label => (
            <Link
              key={label}
              to={`/${label.toLowerCase() === 'documentation' ? 'docs' : label.toLowerCase()}`}
              className="text-sm font-semibold tracking-wide transition-colors duration-200 hover:text-[var(--c-accent)]"
              style={{ color: 'var(--c-text-muted)' }}
            >
              {label}
            </Link>
          ))}
          <Link to="/auth">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              className="px-7 py-2.5 rounded-xl text-sm font-bold neon-glow-box"
              style={{
                background: 'linear-gradient(135deg, var(--c-accent) 0%, #4facfe 50%, var(--c-purple) 100%)',
                color: '#0B0C10',
              }}
            >
              Get Started
            </motion.button>
          </Link>
        </div>

        {/* Mobile CTA */}
        <Link to="/auth" className="md:hidden">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="px-5 py-2 rounded-xl text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--c-accent) 0%, var(--c-purple) 100%)',
              color: '#0B0C10',
            }}
          >
            Get Started
          </motion.button>
        </Link>
      </motion.nav>

      {/* ── Hero Section ── */}
      <section className="w-full max-w-6xl mx-auto px-6 lg:px-10 pt-16 sm:pt-24 lg:pt-32 pb-20 relative z-10">
        <div className="max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-[5.5rem] font-display font-black tracking-tighter leading-[0.92] mb-8"
            style={{ color: 'var(--c-text-primary)' }}
          >
            Absolute{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: 'linear-gradient(135deg, var(--c-accent) 20%, #4facfe 60%, var(--c-purple) 100%)',
              }}
            >
              Clarity.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl text-lg sm:text-xl leading-relaxed mb-10"
            style={{ color: 'var(--c-text-secondary)' }}
          >
            Autonomous, AI-driven vulnerability scanning with real-time remediation guidance. Know exactly where you stand.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link to="/auth">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-bold neon-glow-box"
                style={{
                  background: 'linear-gradient(135deg, var(--c-accent) 0%, #4facfe 50%, var(--c-purple) 100%)',
                  color: '#0B0C10',
                }}
              >
                <span>Start Scanning</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </motion.button>
            </Link>
            <Link to="/docs">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-sm font-bold transition-colors"
                style={{
                  background: 'var(--c-icon-btn-bg)',
                  border: '1px solid var(--c-icon-btn-border)',
                  color: 'var(--c-text-primary)',
                }}
              >
                <span>Read Documentation</span>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Stats Row ── */}
      <section className="w-full max-w-6xl mx-auto px-6 lg:px-10 pb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-[2rem] p-1.5"
        >
          <div
            className="rounded-[calc(2rem-0.375rem)] p-6 lg:p-8 flex flex-col sm:flex-row items-center justify-around gap-6"
            style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.18)' }}
          >
            {STATS.map((stat, i) => (
              <div key={i} className="text-center flex-1">
                <div
                  className="text-3xl lg:text-4xl font-display font-black tracking-tight mb-1"
                  style={{ color: 'var(--c-accent)' }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--c-text-muted)' }}
                >
                  {stat.label}
                </div>
                {i < STATS.length - 1 && (
                  <div className="hidden sm:block absolute right-0 top-1/4 bottom-1/4 w-px" style={{ background: 'var(--c-border)' }} />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Features Grid ── */}
      <section className="w-full max-w-6xl mx-auto px-6 lg:px-10 py-16 lg:py-24 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <h2
            className="text-3xl sm:text-4xl font-display font-black tracking-tight mb-4"
            style={{ color: 'var(--c-text-primary)' }}
          >
            Built for Modern Security
          </h2>
          <p
            className="max-w-lg mx-auto text-base leading-relaxed"
            style={{ color: 'var(--c-text-muted)' }}
          >
            Everything you need to understand, analyze, and resolve vulnerabilities — all in one place.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="w-full max-w-6xl mx-auto px-6 lg:px-10 py-20 lg:py-28 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-[2.5rem] p-1.5 sm:p-2"
        >
          <div
            className="rounded-[calc(2.5rem-0.5rem)] p-10 sm:p-14 lg:p-20 text-center relative overflow-hidden"
            style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}
          >
            {/* Inner ambient glow */}
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
              style={{ background: 'var(--c-accent-dim)', filter: 'blur(80px)', opacity: 0.4 }}
            />

            <h2
              className="text-3xl sm:text-5xl font-display font-black tracking-tight mb-6 relative z-10"
              style={{ color: 'var(--c-text-primary)' }}
            >
              Ready to know where you stand?
            </h2>
            <p
              className="max-w-md mx-auto text-base leading-relaxed mb-10 relative z-10"
              style={{ color: 'var(--c-text-muted)' }}
            >
              Start a free scan in under 30 seconds. No credit card, no complex setup.
            </p>
            <Link to="/auth" className="relative z-10 inline-block">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="px-10 py-4 rounded-xl text-sm font-bold neon-glow-box"
                style={{
                  background: 'linear-gradient(135deg, var(--c-accent) 0%, #4facfe 50%, var(--c-purple) 100%)',
                  color: '#0B0C10',
                }}
              >
                Get Started — Free
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full relative z-10 mt-auto" style={{ borderTop: '1px solid var(--c-border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
              <img src={logo} alt="NEXA" className="h-6 w-auto" />
              <span
                className="text-base font-display font-bold tracking-wider"
                style={{ color: 'var(--c-text-primary)' }}
              >
                NEXA
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
              © 2026 NEXA. Defensive Operations Only.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-10 gap-y-3 text-sm font-medium" style={{ color: 'var(--c-text-muted)' }}>
            <Link to="/about" className="hover:text-[var(--c-accent)] transition-colors">About</Link>
            <Link to="/pricing" className="hover:text-[var(--c-accent)] transition-colors">Pricing</Link>
            <Link to="/privacy-policy" className="hover:text-[var(--c-accent)] transition-colors">Privacy</Link>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-[var(--c-accent)] transition-colors">Twitter</a>

            <Link to="/contact" className="hover:text-[var(--c-accent)] transition-colors">Contact</Link>
            <Link to="/docs" className="hover:text-[var(--c-accent)] transition-colors">Docs</Link>
            <Link to="/terms-of-service" className="hover:text-[var(--c-accent)] transition-colors">Terms</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[var(--c-accent)] transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
