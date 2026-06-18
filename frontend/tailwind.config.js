/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // We control this via <html class="dark"> — Sidebar.jsx writes it directly.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Original nexa palette kept for any legacy usage
        nexa: {
          black: '#0B0C10',
          dark: '#1F2833',
          cyan: '#66FCF1',
          teal: '#45A29E',
          purple: '#6B46C1',
          light: '#FFFFFF',
        },
        // Primary NEXA brand tokens — these are what Dashboard.jsx and components use
        'space-darkest': '#0B0C10',
        'space-dark':    '#1F2833',
        'liquid-cyan':   '#00F2FE',
        'liquid-blue':   '#4facfe',
        'liquid-amethyst': '#9B5DE5',
        'text-primary':  '#E8EAF0',
        'text-secondary': '#8892A4',
      },
      boxShadow: {
        'liquid':       '0 8px 32px 0 rgba(11, 12, 16, 0.37)',
        'neon-cyan':    '0 0 10px rgba(0, 242, 254, 0.5), 0 0 20px rgba(0, 242, 254, 0.3)',
        'glass-cyan':   '0 0 20px rgba(0, 242, 254, 0.35)',
        'logo-glow':    '0 4px 15px rgba(0, 242, 254, 0.6)',
        'light-frosted': '0 4px 30px rgba(0, 0, 0, 0.05)',
      },
      backdropBlur: {
        'glass':  '16px',
        'heavy':  '24px',
        'md':     '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
