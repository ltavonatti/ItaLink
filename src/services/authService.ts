/**
 * Standalone Local Authentication Service
 * Uses native Web Crypto API for SHA-256 password hashing and localStorage for persistence.
 * Zero external backend or third-party auth dependencies.
 */

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

const USERS_STORAGE_KEY = 'zen_italian_users';
const SESSION_STORAGE_KEY = 'zen_italian_active_session';
const SALT_SEED = 'zen_italian_crypto_salt_2026_';

/**
 * Hash password using Web Crypto API SHA-256
 */
async function hashPassword(password: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(SALT_SEED + password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple hash if crypto.subtle is unavailable
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
  }

  private restoreSession(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        this.currentUser = JSON.parse(raw);
      }
    } catch (e) {
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
   * Register a new local user account
   */
  public async signUp(username: string, email: string, password: string): Promise<UserAccount> {
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 2) {
      throw new Error('Username must be at least 2 characters.');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }

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
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setSession(newUser);
    return newUser;
  }

  /**
   * Log into an existing account
   */
  public async login(identifier: string, password: string): Promise<UserAccount> {
    const clean = identifier.trim().toLowerCase();
    const users = this.getUsers();

    const user = users.find(
      (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );

    if (!user) {
      throw new Error('Account not found. Please verify your username or sign up.');
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
   * Instant guest access for immediate evaluation
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
    this.setSession(null);
  }
}

export const authService = new AuthService();
export default authService;

