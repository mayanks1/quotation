import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'tisha_ledger_passcode_v1';
const UNLOCKED_SESSION_KEY = 'tisha_ledger_passcode_unlocked';
const DEFAULT_PASSCODE = '1234';

export interface PasscodeConfig {
  passcode: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const passcodeService = {
  getPasscode(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.passcode) {
          return String(parsed.passcode).trim();
        }
      }
    } catch (e) {}
    return DEFAULT_PASSCODE;
  },

  async loadFromCloud(): Promise<string> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.getPasscode();
    }

    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('profile')
        .eq('id', 'ledger_passcode_config')
        .maybeSingle();

      if (!error && data && data.profile && data.profile.passcode) {
        const cloudPasscode = String(data.profile.passcode).trim();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.profile));
        return cloudPasscode;
      }
    } catch (err) {
      console.warn('Could not load passcode from cloud:', err);
    }
    return this.getPasscode();
  },

  async updatePasscode(newPasscode: string, updatedBy?: string): Promise<{ success: boolean; error?: string }> {
    const cleanPass = String(newPasscode).trim();
    if (cleanPass.length < 4) {
      return { success: false, error: 'Passcode must be at least 4 digits/characters.' };
    }

    const payload: PasscodeConfig = {
      passcode: cleanPass,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Super Admin',
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.from('company_settings').upsert({
          id: 'ledger_passcode_config',
          profile: payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        if (error) {
          console.warn('Cloud passcode sync notice:', error);
        }
      }

      // Automatically keep the session unlocked after changing
      this.unlockSession();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update passcode' };
    }
  },

  verify(inputPasscode: string): boolean {
    const current = this.getPasscode();
    return String(inputPasscode).trim() === current;
  },

  isSessionUnlocked(): boolean {
    try {
      return sessionStorage.getItem(UNLOCKED_SESSION_KEY) === 'true';
    } catch (e) {
      return false;
    }
  },

  unlockSession(): void {
    try {
      sessionStorage.setItem(UNLOCKED_SESSION_KEY, 'true');
    } catch (e) {}
  },

  lockSession(): void {
    try {
      sessionStorage.removeItem(UNLOCKED_SESSION_KEY);
    } catch (e) {}
  },
};
