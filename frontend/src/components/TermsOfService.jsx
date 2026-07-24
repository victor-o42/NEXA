import React from 'react';
import { motion } from 'framer-motion';

export default function TermsOfService() {
  return (
    <div className="relative min-h-screen p-6 sm:p-12 md:p-24 flex justify-center text-[var(--c-text-primary)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-3xl w-full"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-[var(--c-accent)] to-[#9b5de5]">
          Terms of Service
        </h1>
        
        <div className="space-y-6 text-[var(--c-text-muted)] leading-relaxed">
          <p><strong>Last Updated:</strong> July 2026</p>
          
          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using NEXA, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
          </p>

          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">2. Neutral Security Utility Status</h2>
          <p>
            NEXA operates as a <strong>neutral infrastructure provider and security utility</strong>. We provide the tools for vulnerability assessment, but we do not take responsibility for the targets you choose to scan, nor the actions you take based on the results. NEXA is not the publisher, sponsor, or instigator of any user-initiated operations.
          </p>

          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">3. Target Authorization & Warranties</h2>
          <p>
            By using our scanning engines (including Nmap and Nuclei integrations), you explicitly warrant and legally guarantee that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You possess the <strong>legal right, ownership, or documented authorization</strong> to scan the domains, IP addresses, and assets you enter into the platform.</li>
            <li>You will not use NEXA to conduct malicious attacks, denial-of-service (DoS) operations, or unauthorized intrusive exploitation.</li>
            <li>Violation of this policy will result in immediate termination of your account without refund, and potential cooperation with law enforcement.</li>
          </ul>

          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">3. Disclaimer of Warranties</h2>
          <p>
            The service is provided on an "as is" and "as available" basis. NEXA makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
          </p>

          <h2 className="text-2xl font-semibold text-[var(--c-text-primary)] mt-8 mb-4">6. Dispute Resolution & Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising out of or related to these Terms or the NEXA service shall be resolved via binding arbitration located in <strong>Lagos, Nigeria</strong>.
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
