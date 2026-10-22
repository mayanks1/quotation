import { supabase, isSupabaseConfigured } from './supabaseClient';

const KEEP_ALIVE_STORAGE_KEY = 'tisha_supabase_keep_alive_last_ping';

export interface KeepAliveStatus {
  lastPingDate?: string;
  lastPingTimestamp?: string;
  status: 'ok' | 'error' | 'idle';
  message?: string;
}

/**
 * Pings Supabase daily to keep the free-tier PostgreSQL instance awake
 * and prevent inactivity auto-pausing.
 */
export async function pingSupabaseHealth(force: boolean = false): Promise<KeepAliveStatus> {
  if (!isSupabaseConfigured() || !supabase) {
    return { status: 'idle', message: 'Supabase is not configured' };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const stored = typeof window !== 'undefined' ? localStorage.getItem(KEEP_ALIVE_STORAGE_KEY) : null;

  if (!force && stored === todayStr) {
    return {
      lastPingDate: stored,
      status: 'ok',
      message: 'Already pinged today',
    };
  }

  try {
    // 1. Direct active database query: queries the database engine so Postgres registers active traffic
    const { data, error } = await supabase
      .from('quotations')
      .select('id')
      .limit(1);

    if (error) {
      console.warn('Supabase Keep-Alive table ping notice:', error.message);
    }

    // 2. HTTP Health check endpoint ping
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }).catch(console.warn);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(KEEP_ALIVE_STORAGE_KEY, todayStr);
    }

    console.info(`[Keep-Alive] Supabase health ping successful for ${todayStr}`);
    return {
      lastPingDate: todayStr,
      lastPingTimestamp: new Date().toISOString(),
      status: 'ok',
      message: 'Health ping successful',
    };
  } catch (err: any) {
    console.warn('[Keep-Alive] Ping warning:', err?.message || err);
    return {
      status: 'error',
      message: err?.message || String(err),
    };
  }
}
