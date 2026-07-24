import React from 'react';
import { motion } from 'framer-motion';

export default function PrivacyPolicy() {
  return (
    <div className="relative min-h-screen p-6 sm:p-12 md:p-24 flex justify-center text-[var(--c-text-primary)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-3xl w-full"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-[var(--c-accent)] to-[#9b5de5]">
          Privacy Policy
        </h1>
        
        <div className="space-y-6 text-[var(--c-text-muted)] leading-relaxed">
          <p><strong>Last Updated:</strong> July 2026</p>
          
          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">1. Introduction</h2>
          <p>
            Welcome to NEXA. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our application and tell you about your privacy rights and how the law protects you.
          </p>

          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">2. Data We Collect</h2>
          <p>
            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
            <li><strong>Contact Data</strong> includes email address.</li>
            <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, and other technology on the devices you use to access this website.</li>
            <li><strong>Usage Data</strong> includes information about how you use our application, including vulnerability scan histories and diagnostic logs.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">3. Data Retention</h2>
          <p>
            We retain your data only for as long as necessary to fulfill the purposes we collected it for. Specifically, diagnostic scan logs and account data are deleted from active systems within 30 days of account termination, and wiped from all backups within 90 days.
          </p>

          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">4. How We Use Your Data</h2>
          <p>
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal obligation.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">5. Honest Security Disclosure</h2>
          <p>
            We do not claim that our systems are impenetrable. No security measure is absolute. While we commit to implementing reasonable, industry-appropriate safeguards (such as AES-256-GCM encryption for all scan targets and session tokens), we do not guarantee perfect security. If you are a security researcher and discover a vulnerability within NEXA, please report it to us responsibly.
          </p>

          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">6. Governing Law & Compliance</h2>
          <p>
            This privacy policy is governed by the <strong>Nigeria Data Protection Act 2023 (NDPA)</strong>. If you are a resident of Nigeria, you have the explicit right to lodge a complaint with the Nigeria Data Protection Commission (NDPC) if you believe your data rights have been violated.
          </p>

          <div className="pt-12 pb-24">
            <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--c-surface-2)] border border-[var(--c-border)] text-sm font-semibold hover:bg-[var(--c-surface-3)] transition-colors duration-200">
              &larr; Return to Dashboard
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
