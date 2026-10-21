import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'tisha_security_settings_v1';

export interface SecuritySettings {
  idleTimeoutMinutes: number; // -1 = Immediate, 0 = disabled, 1, 5, 10, 15, 30, 60, 120, 240
  ledgerPasscodeRequired: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  idleTimeoutMinutes: 30, // 30 minutes default
  ledgerPasscodeRequired: true,
};

export const securityService = {
  getSettings(): SecuritySettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SECURITY_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {}
    return DEFAULT_SECURITY_SETTINGS;
  },

  async loadFromCloud(): Promise<SecuritySettings> {
    if (!isSupabaseConfigured() || !supabase) {
      return this.getSettings();
    }

    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('profile')
        .eq('id', 'security_settings')
        .maybeSingle();

      if (!error && data && data.profile) {
        const merged: SecuritySettings = { ...DEFAULT_SECURITY_SETTINGS, ...data.profile };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.warn('Could not load security settings from cloud:', e);
    }
    return this.getSettings();
  },

  async saveSettings(settings: Partial<SecuritySettings>, updatedBy?: string): Promise<{ success: boolean; error?: string }> {
    const current = this.getSettings();
    const payload: SecuritySettings = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Admin',
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.from('company_settings').upsert({
          id: 'security_settings',
          profile: payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        if (error) {
          console.warn('Cloud security sync notice:', error);
        }
      }

      // Notify window of updated security settings so active listeners update immediately
      window.dispatchEvent(new CustomEvent('tisha_security_settings_changed', { detail: payload }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save security settings' };
    }
  },
};
