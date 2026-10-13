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
          // Dynamic Light Mode Tokens (Lacquer Red & Warm Rice Paper)
          primary: "var(--zen-primary, #981701)",
          "primary-light": "#e86b54",
          "primary-dark": "#721000",
          secondary: "#864e5a",
          "secondary-light": "#feb6c4",
          "secondary-dark": "#6b3743",
          surface: "var(--zen-surface, #f6f4ee)",
          "surface-dim": "#ded8cb",
          "surface-container": "var(--zen-surface-container, #ebe7dd)",
          "surface-high": "var(--zen-surface-high, #e0dacd)",
          "surface-lowest": "var(--zen-surface-lowest, #ffffff)",
          text: "var(--zen-text, #161d1f)",
          "text-muted": "var(--zen-text-muted, #5c574f)",
          border: "var(--zen-border, #d4cdc0)",
          accent: "#76574e",
          "accent-light": "#e6bdb2",
          error: "#ba1a1a",
          "error-light": "#ffdad6",

          // Dynamic Dark Mode Tokens (Deep Charcoal & Golden Sun Amber)
          "dark-bg": "var(--zen-dark-bg, #0a0a0c)",
          "dark-surface": "var(--zen-dark-surface, #121316)",
          "dark-surface-high": "var(--zen-dark-surface-high, #1c1d22)",
          "dark-surface-lowest": "var(--zen-dark-surface-lowest, #000000)",
          "dark-text": "var(--zen-dark-text, #f7f6f2)",
          "dark-text-muted": "var(--zen-dark-text-muted, #bab9b0)",
          "dark-border": "var(--zen-dark-border, #282930)",
          "dark-primary": "var(--zen-dark-primary, #df9e12)",
          "dark-primary-hover": "#c88c0a",
          "dark-on-primary": "var(--zen-dark-on-primary, #0a0a0c)",
          "dark-secondary": "var(--zen-dark-secondary, #ecb233)",
        },
      },
      fontFamily: {
        headline: ['Literata', 'serif'],
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        pinyin: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'zen-sm': '0px 4px 16px rgba(45, 52, 70, 0.04)',
        'zen-md': '0px 8px 24px rgba(45, 52, 70, 0.06)',
        'zen-lg': '0px 12px 32px rgba(45, 52, 70, 0.1)',
        'zen-dark-sm': '0px 4px 16px rgba(0, 0, 0, 0.4)',
        'zen-dark-md': '0px 8px 24px rgba(0, 0, 0, 0.55)',
        'zen-dark-lg': '0px 12px 32px rgba(0, 0, 0, 0.7)',
      },
    },
  },
  plugins: [],
};

