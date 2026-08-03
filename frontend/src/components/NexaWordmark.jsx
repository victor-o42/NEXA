import React, { useId } from 'react';

/**
 * NexaWordmark — 100% Solid Vector Insignia.
 * Uses instance-unique SVG gradient IDs and userSpaceOnUse continuous coordinates
 * so the Liquid Cyan -> Electric Blue -> Amethyst Purple gradient flows seamlessly
 * across all letters from N to Λ without breaking on dashboard navigation.
 */
export default function NexaWordmark({ height = 32, className = '', glow = true }) {
  const rawId = useId ? useId() : 'nwm';
  const gradId = `nexa-grad-${rawId.replace(/:/g, '')}`;
  const numericHeight = typeof height === 'number' ? height : parseInt(height, 10) || 32;
  const computedWidth = (numericHeight * 165) / 36;

  return (
    <svg
      viewBox="0 0 165 36"
      width={computedWidth}
      height={numericHeight}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: glow ? 'drop-shadow(0 0 10px rgba(0, 242, 254, 0.55)) drop-shadow(0 0 22px rgba(155, 93, 229, 0.35))' : 'none',
      }}
      className={`select-none flex-shrink-0 transition-all duration-300 ${className}`}
      aria-label="NEXA"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="150" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00F2FE" />
          <stop offset="45%" stopColor="#4facfe" />
          <stop offset="100%" stopColor="#9B5DE5" />
        </linearGradient>
      </defs>

      <g fill={`url(#${gradId})`}>
        {/* ── N ── */}
        <polygon points="6,32 10.5,32 10.5,13 25.5,32 30,32 30,4 25.5,4 25.5,23 10.5,4 6,4" />

        {/* ── E (3 Floating Solid Horizontal Bars — NO spine) ── */}
        <rect x="42" y="4" width="24" height="4.5" rx="1" />
        <rect x="42" y="15.75" width="24" height="4.5" rx="1" />
        <rect x="42" y="27.5" width="24" height="4.5" rx="1" />

        {/* ── X ── */}
        <polygon points="78,4 82.5,4 90,14.5 97.5,4 102,4 92.5,18 102,32 97.5,32 90,21.5 82.5,32 78,32 87.5,18" />

        {/* ── Λ (Inverted Chevron A — matching cap-height y=4 & baseline y=32) ── */}
        <polygon points="114,32 118.5,32 129,7.5 139.5,32 144,32 131.2,4 126.8,4" />
      </g>
    </svg>
  );
}
