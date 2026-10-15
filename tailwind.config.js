function withOpacity(cssVar, fallbackHex) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, var(${cssVar}, ${fallbackHex}) calc(100% * ${opacityValue}), transparent)`;
    }
    return `var(${cssVar}, ${fallbackHex})`;
  };
}

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
          primary: withOpacity("--zen-primary", "#0066cc"),
          "primary-light": "#38bdf8",
          "primary-dark": "#004b99",
          secondary: "#0284c7",
          "secondary-light": "#bae6fd",
          "secondary-dark": "#0369a1",
          surface: withOpacity("--zen-surface", "#f8fafc"),
          "surface-dim": "#f1f5f9",
          "surface-container": withOpacity("--zen-surface-container", "#f1f5f9"),
          "surface-high": withOpacity("--zen-surface-high", "#e2e8f0"),
          "surface-lowest": withOpacity("--zen-surface-lowest", "#ffffff"),
          text: withOpacity("--zen-text", "#0f172a"),
          "text-muted": withOpacity("--zen-text-muted", "#64748b"),
          border: withOpacity("--zen-border", "#e2e8f0"),
          accent: "#0ea5e9",
          "accent-light": "#e0f2fe",
          error: "#ef4444",
          "error-light": "#fee2e2",

          // Dynamic Dark Mode Tokens (Riviera Midnight & Electric Azure - Calibrated & Harmonious)
          "dark-bg": withOpacity("--zen-dark-bg", "#0b0f19"),
          "dark-surface": withOpacity("--zen-dark-surface", "#131c2e"),
          "dark-surface-high": withOpacity("--zen-dark-surface-high", "#1e293b"),
          "dark-surface-lowest": withOpacity("--zen-dark-surface-lowest", "#070b14"),
          "dark-text": withOpacity("--zen-dark-text", "#f1f5f9"),
          "dark-text-muted": withOpacity("--zen-dark-text-muted", "#94a3b8"),
          "dark-border": withOpacity("--zen-dark-border", "#243049"),
          "dark-primary": withOpacity("--zen-dark-primary", "#38bdf8"),
          "dark-primary-hover": "#0ea5e9",
          "dark-on-primary": withOpacity("--zen-dark-on-primary", "#0b0f19"),
          "dark-secondary": withOpacity("--zen-dark-secondary", "#818cf8"),
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
        'zen-dark-sm': '0px 2px 8px rgba(0, 0, 0, 0.35)',
        'zen-dark-md': '0px 4px 16px rgba(0, 0, 0, 0.45)',
        'zen-dark-lg': '0px 8px 32px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
};

