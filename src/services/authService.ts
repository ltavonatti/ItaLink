/**
 * Integrated Authentication Service
 * 
 * Direct Supabase Cloud Authentication with fallback to Web Crypto API for offline usage.
 * Supports registered accounts with cloud sync and isolated Guest mode.
 */

import cloudService from './cloudService';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: number;
  lastLoginAt: number;
  isGuest?: boolean;
}

export interface SignUpResult {
  user?: UserAccount;
  requiresConfirmation?: boolean;
  message?: string;
}

const USERS_STORAGE_KEY = 'zen_italian_users';
const SESSION_STORAGE_KEY = 'zen_italian_active_session';
const SALT_SEED = 'zen_italian_crypto_salt_2026_';

/**
 * Hash password using Web Crypto API SHA-256 (for offline fallback mode)
 */
async function hashPassword(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(SALT_SEED + password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash)}`;
}

class AuthService {
  private currentUser: UserAccount | null = null;
  private listeners: Set<(user: UserAccount | null) => void> = new Set();

  constructor() {
    this.restoreSession();

    // Listen to Supabase auth events
    if (cloudService.isConfigured()) {
      cloudService.onAuthStateChange((sbUser) => {
        if (sbUser) {
          const displayName =
            sbUser.user_metadata?.displayName ||
            sbUser.user_metadata?.full_name ||
            sbUser.email?.split('@')[0] ||
            'Learner';
          const account: UserAccount = {
            id: sbUser.id,
            username: displayName,
            email: sbUser.email || '',
            displayName: displayName,
            passwordHash: '',
            createdAt: new Date(sbUser.created_at || Date.now()).getTime(),
            lastLoginAt: Date.now(),
            isGuest: false,
          };
          this.currentUser = account;
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(account));
          }
          this.notify();
        } else {
          // If Supabase signed out and the active user was a registered cloud user, clear session
          if (this.currentUser && !this.currentUser.isGuest) {
            this.currentUser = null;
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.removeItem(SESSION_STORAGE_KEY);
            }
            this.notify();
          }
        }
      });
    }
  }

  private restoreSession(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed: UserAccount = JSON.parse(raw);
        // Invalidate legacy mock sessions (starting with usr_) if cloud service is configured
        if (cloudService.isConfigured() && parsed.id?.startsWith('usr_')) {
          this.currentUser = null;
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        } else {
          this.currentUser = parsed;
        }
      }
    } catch {
      this.currentUser = null;
    }
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  public subscribe(callback: (user: UserAccount | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public isGuestUser(): boolean {
    return !!this.currentUser?.isGuest;
  }

  private getUsers(): UserAccount[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveUsers(users: UserAccount[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  private setSession(user: UserAccount | null): void {
    this.currentUser = user;
    if (typeof window !== 'undefined' && window.localStorage) {
      if (user) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
    this.notify();
  }

  /**
   * Register a new user account (Cloud if configured, fallback to local WebCrypto)
   */
  public async signUp(
    username: string,
    email: string,
    password: string
  ): Promise<SignUpResult> {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 2) {
      throw new Error('Username must be at least 2 characters.');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    if (cloudService.isConfigured()) {
      const res = await cloudService.signUpWithEmail(cleanEmail, password, cleanUsername);
      if (!res.success) {
        throw new Error(res.error || 'Failed to create account.');
      }

      if (res.requiresConfirmation) {
        return {
          requiresConfirmation: true,
          message: `Confirmation email sent to ${cleanEmail}. Please verify your email before signing in.`,
        };
      }

      if (res.user) {
        const displayName = cleanUsername || res.user.email?.split('@')[0] || 'Learner';
        const account: UserAccount = {
          id: res.user.id,
          username: displayName,
          email: res.user.email || cleanEmail,
          displayName: displayName,
          passwordHash: '',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          isGuest: false,
        };
        this.setSession(account);
        return { user: account };
      }
    }

    // Fallback: Local WebCrypto registration
    const users = this.getUsers();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      throw new Error('This username is already taken. Please choose another.');
    }
    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(password);
    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      email: cleanEmail,
      displayName: cleanUsername,
      passwordHash,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isGuest: false,
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setSession(newUser);
    return { user: newUser };
  }

  /**
   * Log into an existing account (Cloud if configured, fallback to local WebCrypto)
   */
  public async login(identifier: string, password: string): Promise<UserAccount> {
    const clean = identifier.trim().toLowerCase();
    if (!clean) {
      throw new Error('Please enter your email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    if (cloudService.isConfigured()) {
      const res = await cloudService.signInWithEmail(clean, password);
      if (!res.success || !res.user) {
        throw new Error(res.error || 'Invalid credentials. Please verify your email and password.');
      }

      const user = res.user;
      const displayName =
        user.user_metadata?.displayName ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Learner';
      const account: UserAccount = {
        id: user.id,
        username: displayName,
        email: user.email || clean,
        displayName: displayName,
        passwordHash: '',
        createdAt: new Date(user.created_at || Date.now()).getTime(),
        lastLoginAt: Date.now(),
        isGuest: false,
      };
      this.setSession(account);
      return account;
    }

    // Fallback: Local WebCrypto authentication
    const users = this.getUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );

    if (!user) {
      throw new Error('Account not found. Please verify your email or sign up.');
    }

    const incomingHash = await hashPassword(password);
    if (user.passwordHash !== incomingHash) {
      throw new Error('Incorrect password. Please try again.');
    }

    user.lastLoginAt = Date.now();
    this.saveUsers(users);
    this.setSession(user);
    return user;
  }

  /**
   * Instant guest access for immediate evaluation (isolated locally, no cloud sync)
   */
  public async guestLogin(): Promise<UserAccount> {
    const guestUser: UserAccount = {
      id: 'guest_user',
      username: 'Guest Learner',
      email: 'guest@zen-italian.local',
      displayName: '访客体验者 / Guest',
      passwordHash: '',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isGuest: true,
    };
    this.setSession(guestUser);
    return guestUser;
  }

  /**
   * Sign out active session
   */
  public logout(): void {
    if (cloudService.isConfigured()) {
      cloudService.signOut().catch((err) => {
        console.warn('[AuthService] Supabase sign out notice:', err);
      });
    }
    this.setSession(null);
  }
}

export const authService = new AuthService();
export default authService;
