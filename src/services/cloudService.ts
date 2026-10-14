/**
 * Decoupled Cloud Synchronization & Remote BaaS Provider
 * 
 * Supports native background syncing to Supabase / PostgreSQL.
 * Reads environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * or user-configured credentials stored locally.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { UserStudyProgress } from './storageService';

export type CloudSyncStatus = 'disconnected' | 'connecting' | 'synced' | 'syncing' | 'offline' | 'error';

export interface CloudCredentials {
  url: string;
  anonKey: string;
}

const STORAGE_KEY_URL = 'zen_cloud_supabase_url';
const STORAGE_KEY_KEY = 'zen_cloud_supabase_anon_key';
const TABLE_NAME = 'user_study_progress';

type SyncStatusListener = (status: CloudSyncStatus, message?: string) => void;
type AuthListener = (user: User | null) => void;

class CloudService {
  private client: SupabaseClient | null = null;
  private status: CloudSyncStatus = 'disconnected';
  private statusMessage: string = '';
  private syncStatusListeners: Set<SyncStatusListener> = new Set();
  private authListeners: Set<AuthListener> = new Set();
  private currentUser: User | null = null;
  private debounceTimer: any = null;

  constructor() {
    this.initClient();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private getEffectiveCredentials(): CloudCredentials | null {
    // 1. Check user-configured credentials first
    if (typeof window !== 'undefined' && window.localStorage) {
      const customUrl = window.localStorage.getItem(STORAGE_KEY_URL)?.trim();
      const customKey = window.localStorage.getItem(STORAGE_KEY_KEY)?.trim();
      if (customUrl && customKey) {
        return { url: customUrl, anonKey: customKey };
      }
    }

    // 2. Fall back to build-time environment variables
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL?.trim();
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY?.trim();
    if (envUrl && envKey) {
      return { url: envUrl, anonKey: envKey };
    }

    return null;
  }

  public initClient(): boolean {
    const creds = this.getEffectiveCredentials();
    if (!creds || !creds.url || !creds.anonKey) {
      this.client = null;
      this.setStatus('disconnected', 'Cloud sync not configured');
      return false;
    }

    try {
      this.client = createClient(creds.url, creds.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });

      // Listen to auth state changes
      this.client.auth.onAuthStateChange((_event, session) => {
        this.currentUser = session?.user || null;
        this.notifyAuthListeners(this.currentUser);
        if (this.currentUser) {
          this.setStatus('synced', 'Connected to cloud account');
        } else {
          this.setStatus('disconnected', 'Signed out');
        }
      });

      // Check current session
      this.client.auth.getSession().then(({ data }) => {
        this.currentUser = data?.session?.user || null;
        this.notifyAuthListeners(this.currentUser);
        if (this.currentUser) {
          this.setStatus('synced', 'Connected');
        }
      });

      return true;
    } catch (err: any) {
      console.warn('[CloudService] Failed to initialize Supabase client:', err);
      this.client = null;
      this.setStatus('error', err?.message || 'Invalid credentials');
      return false;
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    if (!isOnline) {
      this.setStatus('offline', 'Internet offline. Changes will queue locally.');
    } else {
      if (this.client && this.currentUser) {
        this.setStatus('synced', 'Online');
      }
    }
  }

  public isConfigured(): boolean {
    return this.client !== null;
  }

  public getStatus(): { status: CloudSyncStatus; message: string } {
    return { status: this.status, message: this.statusMessage };
  }

  private setStatus(status: CloudSyncStatus, message: string = '') {
    this.status = status;
    this.statusMessage = message;
    this.syncStatusListeners.forEach((fn) => fn(status, message));
  }

  public onSyncStatusChange(listener: SyncStatusListener): () => void {
    this.syncStatusListeners.add(listener);
    listener(this.status, this.statusMessage);
    return () => this.syncStatusListeners.delete(listener);
  }

  public onAuthStateChange(listener: AuthListener): () => void {
    this.authListeners.add(listener);
    listener(this.currentUser);
    return () => this.authListeners.delete(listener);
  }

  private notifyAuthListeners(user: User | null) {
    this.authListeners.forEach((fn) => fn(user));
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Set / Clear custom credentials from the UI
  public setCustomCredentials(url: string, anonKey: string): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_URL, url.trim());
      window.localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    }
    return this.initClient();
  }

  public clearCustomCredentials(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY_URL);
      window.localStorage.removeItem(STORAGE_KEY_KEY);
    }
    this.initClient();
  }

  public getSavedCustomCredentials(): CloudCredentials | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const url = window.localStorage.getItem(STORAGE_KEY_URL);
      const anonKey = window.localStorage.getItem(STORAGE_KEY_KEY);
      if (url && anonKey) return { url, anonKey };
    }
    return null;
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  public async signUpWithEmail(email: string, password: string, displayName?: string): Promise<{ success: boolean; error?: string; user?: User; requiresConfirmation?: boolean }> {
    if (!this.client) {
      return { success: false, error: 'Cloud service is not configured. Please supply Supabase URL and Key.' };
    }
    try {
      this.setStatus('connecting', 'Creating account...');
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: displayName ? { data: { displayName } } : undefined,
      });
      if (error) {
        this.setStatus('error', error.message);
        return { success: false, error: error.message };
      }
      this.currentUser = data.user;
      this.setStatus('synced', 'Account created');
      const requiresConfirmation = !data.session;
      return { success: true, user: data.user || undefined, requiresConfirmation };
    } catch (err: any) {
      this.setStatus('error', err?.message || 'Sign up failed');
      return { success: false, error: err?.message };
    }
  }

  public async signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    if (!this.client) {
      return { success: false, error: 'Cloud service is not configured.' };
    }
    try {
      this.setStatus('connecting', 'Signing in...');
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) {
        this.setStatus('error', error.message);
        return { success: false, error: error.message };
      }
      this.currentUser = data.user;
      this.setStatus('synced', 'Signed in');
      return { success: true, user: data.user };
    } catch (err: any) {
      this.setStatus('error', err?.message || 'Sign in failed');
      return { success: false, error: err?.message };
    }
  }

  public async signInWithOAuth(provider: 'google' | 'github'): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Cloud service is not configured.' };
    }
    try {
      const { error } = await this.client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  public async signOut(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut();
      this.currentUser = null;
      this.setStatus('disconnected', 'Signed out');
    }
  }

  // ==========================================
  // DATA SYNCHRONIZATION
  // ==========================================

  /**
   * Fetch latest study progress from the cloud
   */
  public async fetchCloudProgress(userId: string): Promise<UserStudyProgress | null> {
    if (!this.client) return null;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;

    try {
      // Determine query ID: prefer authenticated user ID if logged in, otherwise userId
      const targetId = this.currentUser?.id || userId;
      
      const { data, error } = await this.client
        .from(TABLE_NAME)
        .select('progress, updated_at')
        .eq('user_id', targetId)
        .maybeSingle();

      if (error) {
        console.warn('[CloudService] Failed to fetch remote progress:', error.message);
        return null;
      }

      if (!data || !data.progress) {
        return null;
      }

      return data.progress as UserStudyProgress;
    } catch (err) {
      console.warn('[CloudService] Exception during remote progress fetch:', err);
      return null;
    }
  }

  /**
   * Push current study progress to the cloud (Immediate)
   */
  public async pushCloudProgress(progress: UserStudyProgress): Promise<boolean> {
    if (!this.client) return false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('offline', 'Offline');
      return false;
    }

    try {
      this.setStatus('syncing', 'Syncing changes to cloud...');

      const targetId = this.currentUser?.id || progress.userId;
      const payload = {
        id: targetId,
        user_id: targetId,
        progress: {
          ...progress,
          userId: targetId,
          updatedAt: Date.now(),
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.client
        .from(TABLE_NAME)
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.warn('[CloudService] Cloud upsert error:', error.message);
        this.setStatus('error', `Sync failed: ${error.message}`);
        return false;
      }

      this.setStatus('synced', 'All progress synced with cloud');
      return true;
    } catch (err: any) {
      console.warn('[CloudService] Sync exception:', err);
      this.setStatus('error', err?.message || 'Sync failed');
      return false;
    }
  }

  /**
   * Schedule debounced cloud sync (called whenever a review is recorded)
   */
  public scheduleDebouncedSync(progress: UserStudyProgress, delayMs: number = 1500): void {
    if (!this.client) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      this.pushCloudProgress(progress);
    }, delayMs);
  }
}

export const cloudService = new CloudService();
export default cloudService;

