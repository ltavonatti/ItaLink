/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zen: {
          // Dynamic Light Mode Tokens (Mediterranean Azure & Crisp Alabaster)
          primary: "var(--zen-primary, #0066cc)",
          "primary-light": "#38bdf8",
          "primary-dark": "#004b99",
          secondary: "#0284c7",
          "secondary-light": "#bae6fd",
          "secondary-dark": "#0369a1",
          surface: "var(--zen-surface, #f8fafc)",
          "surface-dim": "#f1f5f9",
          "surface-container": "var(--zen-surface-container, #f1f5f9)",
          "surface-high": "var(--zen-surface-high, #e2e8f0)",
          "surface-lowest": "var(--zen-surface-lowest, #ffffff)",
          text: "var(--zen-text, #0f172a)",
          "text-muted": "var(--zen-text-muted, #64748b)",
          border: "var(--zen-border, #e2e8f0)",
          accent: "#0ea5e9",
          "accent-light": "#e0f2fe",
          error: "#ef4444",
          "error-light": "#fee2e2",

          // Dynamic Dark Mode Tokens (Riviera Midnight & Electric Azure)
          "dark-bg": "var(--zen-dark-bg, #090d16)",
          "dark-surface": "var(--zen-dark-surface, #0f172a)",
          "dark-surface-high": "var(--zen-dark-surface-high, #1e293b)",
          "dark-surface-lowest": "var(--zen-dark-surface-lowest, #050811)",
          "dark-text": "var(--zen-dark-text, #f8fafc)",
          "dark-text-muted": "var(--zen-dark-text-muted, #94a3b8)",
          "dark-border": "var(--zen-dark-border, #1e293b)",
          "dark-primary": "var(--zen-dark-primary, #38bdf8)",
          "dark-primary-hover": "#0ea5e9",
          "dark-on-primary": "var(--zen-dark-on-primary, #090d16)",
          "dark-secondary": "var(--zen-dark-secondary, #60a5fa)",
        },
      },
      fontFamily: {
        headline: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
        pinyin: ['Plus Jakarta Sans', 'Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'zen-sm': '0px 2px 8px rgba(15, 23, 42, 0.04)',
        'zen-md': '0px 4px 16px rgba(15, 23, 42, 0.06)',
        'zen-lg': '0px 8px 30px rgba(15, 23, 42, 0.08)',
        'zen-dark-sm': '0px 2px 8px rgba(0, 0, 0, 0.4)',
        'zen-dark-md': '0px 4px 16px rgba(0, 0, 0, 0.55)',
        'zen-dark-lg': '0px 8px 30px rgba(0, 0, 0, 0.7)',
      },
    },
  },
  plugins: [],
};

