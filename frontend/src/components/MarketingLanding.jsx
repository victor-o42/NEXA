import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../assets/nexa_logo.png';

export default function MarketingLanding() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center px-4 sm:px-6 lg:px-8 py-12 lg:py-24 selection:bg-cyan-500/30 selection:text-white text-center">
      
      {/* ── Background Ambient Layers ── */}
      {/* The App.jsx global orbs are behind this. We add some local deep space glow. */}
      <div className="absolute inset-0 -z-10 pointer-events-none" style={{ background: 'radial-gradient(circle at top, rgba(0,242,254,0.04) 0%, transparent 60%)' }} />

      {/* ── Top Nav (Minimalist) ── */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 max-w-7xl mx-auto right-0"
      >
        <div className="flex items-center gap-3">
          <img src={logo} alt="NEXA" className="h-8 w-auto filter drop-shadow-[0_0_12px_rgba(0,242,254,0.4)]" />
          <span className="text-xl font-bold tracking-widest text-white">NEXA</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hidden sm:block text-sm font-medium tracking-wide transition-colors" style={{ color: 'var(--c-text-muted)' }} onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'var(--c-text-muted)'}>
            Features
          </a>
          <Link 
            to="/auth" 
            className="px-6 py-2 rounded-full text-sm font-bold transition-all relative overflow-hidden group"
            style={{ background: 'var(--c-surface-inset)', border: '1px solid var(--c-border)', color: 'var(--c-text-primary)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#00F2FE]/20 to-[#4facfe]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
            <span className="relative z-10">Sign In</span>
          </Link>
        </div>
      </motion.nav>

      {/* ── HERO SECTION ── */}
      <main className="w-full max-w-5xl mx-auto flex-1 flex flex-col items-center justify-center mt-12 lg:mt-20 z-10 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border"
          style={{ background: 'rgba(0,242,254,0.05)', borderColor: 'rgba(0,242,254,0.15)' }}
        >
          <span className="w-2 h-2 rounded-full bg-[#00F2FE] animate-pulse drop-shadow-[0_0_6px_#00F2FE]" />
          <span className="text-xs font-bold tracking-widest uppercase text-[#00F2FE]">Nexa Security Engine v2.0 Live</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-6xl lg:text-[5.5rem] font-extrabold tracking-tight leading-[1.05] mb-8 text-transparent bg-clip-text"
          style={{ backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.4) 100%)' }}
        >
          Stop at nothing.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] to-[#4facfe] filter drop-shadow-[0_0_30px_rgba(0,242,254,0.3)]">
            Relentless Security.
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl text-lg sm:text-xl font-medium leading-relaxed mb-12"
          style={{ color: 'var(--c-text-secondary)' }}
        >
          We don't want you to stop building. But we do want you to know your code is bulletproof. 
          NEXA actively audits your infrastructure with military-grade precision, wrapped in a 
          human-centered interface.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          {/* Primary CTA with Double Bezel */}
          <Link to="/auth">
            <motion.div 
              whileHover={{ scale: 1.05, transition: { duration: 0.15, ease: 'easeOut' } }}
              whileTap={{ scale: 0.95 }}
              className="glass-panel p-1.5 rounded-[2rem] cursor-pointer"
            >
              <div 
                className="px-8 py-4 rounded-[calc(2rem-0.375rem)] flex items-center gap-3 font-bold text-lg relative overflow-hidden"
                style={{ 
                  background: 'linear-gradient(135deg, #00F2FE 0%, #4facfe 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 8px 32px rgba(0,242,254,0.3)'
                }}
              >
                <span className="text-[#0B0C10] relative z-10">Start Scanning Now</span>
                <svg className="w-5 h-5 text-[#0B0C10] relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </motion.div>
          </Link>
          
          <a href="#features">
            <motion.div 
              whileHover={{ scale: 1.05, transition: { duration: 0.15, ease: 'easeOut' } }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-full font-bold text-lg border cursor-pointer transition-colors"
              style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-primary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-surface-inset)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Explore Capabilities
            </motion.div>
          </a>
        </motion.div>
      </main>

      {/* ── BENTO FEATURES GRID ── */}
      <section id="features" className="w-full max-w-6xl mx-auto mt-32 lg:mt-48 z-10 text-left">
        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-extrabold mb-12 text-center" 
          style={{ color: 'var(--c-text-primary)' }}
        >
          Engineered for absolute clarity.
        </motion.h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: AI Analysis */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            whileHover={{ y: -5, transition: { duration: 0.15, ease: 'easeOut' } }}
            className="glass-panel p-1.5 rounded-[2.5rem] md:col-span-2 md:row-span-2 transition-all duration-200"
          >
            <div className="h-full rounded-[calc(2.5rem-0.375rem)] p-8 md:p-12 relative overflow-hidden flex flex-col justify-end min-h-[400px]" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
              
              {/* Mock AI Chat Interface replacing the empty space */}
              <div className="absolute top-0 left-0 right-0 bottom-40 p-8 flex flex-col gap-4 pointer-events-none opacity-80" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }}>
                <div className="flex gap-3 items-end">
                  <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center shrink-0" style={{ background: 'var(--c-surface-2)' }}>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div className="glass-panel p-3 rounded-2xl rounded-bl-sm border border-white/5 text-xs font-mono text-gray-300">
                    Nmap scan completed. 22/SSH is open.
                  </div>
                </div>
                
                <div className="flex gap-3 items-end self-end flex-row-reverse">
                  <div className="w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,242,254,0.3)]" style={{ background: 'rgba(0,242,254,0.1)', borderColor: 'var(--c-accent)' }}>
                    <img src={logo} alt="NEXA AI" className="w-4 h-4 object-contain filter drop-shadow-[0_0_5px_rgba(0,242,254,0.5)]" />
                  </div>
                  <div className="p-4 rounded-2xl rounded-br-sm border text-sm max-w-[80%]" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'var(--c-accent-dim)', color: 'var(--c-text-primary)' }}>
                    <span className="text-[#00F2FE] font-bold block mb-1">NEXA Security Agent</span>
                    Port 22 being open isn't inherently bad, but it exposes you to brute-force attacks. I recommend disabling password authentication and moving to key-based auth. I've generated a hardening script for your sshd_config.
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-auto">
                <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--c-text-primary)' }}>Conversational AI Analysis</h3>
                <p className="max-w-md text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Don't just stare at JSON payloads. NEXA's built-in AI translates complex vulnerability reports into plain English, offering immediate remediation scripts tailored to your stack.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Nuclei Core */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -5, transition: { duration: 0.15, ease: 'easeOut' } }}
            className="glass-panel p-1.5 rounded-[2rem] transition-all duration-200"
          >
            <div className="h-full rounded-[calc(2rem-0.375rem)] p-8 relative overflow-hidden flex flex-col" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
              <div className="w-12 h-12 rounded-xl mb-auto flex items-center justify-center" style={{ background: 'rgba(0,242,254,0.1)', color: '#00F2FE' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mt-8 mb-2" style={{ color: 'var(--c-text-primary)' }}>Nuclei Powered</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Industry standard YAML-based scanning engines running seamlessly in the background.
              </p>
            </div>
          </motion.div>

          {/* Card 3: Deep Nmap */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -5, transition: { duration: 0.15, ease: 'easeOut' } }}
            className="glass-panel p-1.5 rounded-[2rem] transition-all duration-200"
          >
            <div className="h-full rounded-[calc(2rem-0.375rem)] p-8 relative overflow-hidden flex flex-col" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
              <div className="w-12 h-12 rounded-xl mb-auto flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mt-8 mb-2" style={{ color: 'var(--c-text-primary)' }}>Port Diagnostics</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Deep Nmap integration maps your open ports and exposed services with zero friction.
              </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="w-full mt-32 mb-24 z-10 flex flex-col items-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-center" style={{ color: 'var(--c-text-primary)' }}>Stop wondering. Start securing.</h2>
        <Link to="/auth">
          <motion.div 
            whileHover={{ scale: 1.05, transition: { duration: 0.15, ease: 'easeOut' } }}
            whileTap={{ scale: 0.95 }}
            className="glass-panel p-1.5 rounded-[2rem] cursor-pointer inline-block"
          >
            <div 
              className="px-10 py-5 rounded-[calc(2rem-0.375rem)] font-bold text-lg"
              style={{ background: 'var(--c-surface-inset)', color: 'var(--c-text-primary)' }}
            >
              Enter NEXA Gateway
            </div>
          </motion.div>
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer className="w-full max-w-6xl mx-auto border-t py-8 mt-auto flex flex-col sm:flex-row justify-between items-center gap-4 z-10" style={{ borderColor: 'var(--c-border-subtle)' }}>
        <div className="flex items-center gap-2 grayscale opacity-50">
          <img src={logo} alt="NEXA" className="h-5 w-auto" />
          <span className="text-sm font-bold tracking-widest text-white">NEXA</span>
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--c-text-hint)' }}>
          © 2026 NEXA. Strictly Defensive Operations Only.
        </div>
      </footer>
    </div>
  );
}
