/**
 * Theme Service for Zen Italian
 * Manages Dark Mode & Light Mode with localStorage persistence and system sync.
 */

export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'zen_italian_theme';

class ThemeService {
  private currentTheme: ThemeMode = 'light';
  private listeners: Set<(theme: ThemeMode) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved === 'dark' || saved === 'light') {
        this.currentTheme = saved;
      } else {
        // Explicit requirement: default theme must strictly be white/light
        this.currentTheme = 'light';
      }
      this.applyTheme(this.currentTheme);
    }
  }

  public getTheme(): ThemeMode {
    return this.currentTheme;
  }

  public isDark(): boolean {
    return this.currentTheme === 'dark';
  }

  public setTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      this.applyTheme(theme);
    }
    this.notify();
  }

  public toggleTheme(): ThemeMode {
    const nextTheme: ThemeMode = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
    return nextTheme;
  }

  private applyTheme(theme: ThemeMode): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.currentTheme));
  }

  public subscribe(callback: (theme: ThemeMode) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentTheme);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const themeService = new ThemeService();
export default themeService;

