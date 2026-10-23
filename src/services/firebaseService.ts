/**
 * Firebase Firestore Failover & Mirror Service
 * 
 * Provides zero-downtime secondary storage via Google Cloud Firestore.
 * Uses native, ultra-lightweight REST endpoints (zero extra bundle bloat).
 * Automatically acts as the failover engine when Supabase is paused or down.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
}

export const CLOUD_FAILOVER_CONFIG_ID = 'cloud_failover_config';

export interface CloudFailoverConfigRecord {
  projectId: string;
  apiKey: string;
  primaryEngine?: 'supabase' | 'firebase';
  updatedAt?: string;
  updatedBy?: string;
}

const FIREBASE_API_KEY_STORAGE = 'tisha_firebase_api_key';
const FIREBASE_PROJECT_ID_STORAGE = 'tisha_firebase_project_id';

let memoryConfig: FirebaseConfig | null = null;

// Get config from memory, Vite environment variables, or localStorage override
export function getFirebaseConfig(): FirebaseConfig | null {
  if (memoryConfig && memoryConfig.apiKey && memoryConfig.projectId) {
    return memoryConfig;
  }
  const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (typeof process !== 'undefined' ? process.env : {}) as any;
  const apiKey = (env.VITE_FIREBASE_API_KEY as string) || (typeof window !== 'undefined' ? localStorage.getItem(FIREBASE_API_KEY_STORAGE) : null) || (typeof globalThis !== 'undefined' && (globalThis as any).localStorage?.getItem(FIREBASE_API_KEY_STORAGE));
  const projectId = (env.VITE_FIREBASE_PROJECT_ID as string) || (typeof window !== 'undefined' ? localStorage.getItem(FIREBASE_PROJECT_ID_STORAGE) : null) || (typeof globalThis !== 'undefined' && (globalThis as any).localStorage?.getItem(FIREBASE_PROJECT_ID_STORAGE));

  if (apiKey && projectId) {
    memoryConfig = { apiKey: apiKey.trim(), projectId: projectId.trim() };
    return memoryConfig;
  }
  return null;
}

export function setFirebaseLocalConfig(apiKey: string, projectId: string): void {
  const cleanKey = apiKey.trim();
  const cleanId = projectId.trim();
  memoryConfig = { apiKey: cleanKey, projectId: cleanId };
  if (typeof window !== 'undefined') {
    localStorage.setItem(FIREBASE_API_KEY_STORAGE, cleanKey);
    localStorage.setItem(FIREBASE_PROJECT_ID_STORAGE, cleanId);
  } else if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    (globalThis as any).localStorage.setItem(FIREBASE_API_KEY_STORAGE, cleanKey);
    (globalThis as any).localStorage.setItem(FIREBASE_PROJECT_ID_STORAGE, cleanId);
  }
}

/**
 * Fetch Firebase & Failover credentials from Supabase company_settings table.
 * Populates local storage and memory cache so mobile immediately recognizes Firebase.
 */
export async function loadFirebaseConfigFromCloud(): Promise<FirebaseConfig | null> {
  if (!isSupabaseConfigured() || !supabase) {
    return getFirebaseConfig();
  }

  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('profile')
      .eq('id', CLOUD_FAILOVER_CONFIG_ID)
      .maybeSingle();

    if (!error && data && data.profile) {
      const p = data.profile as CloudFailoverConfigRecord;
      if (p.projectId && p.apiKey) {
        setFirebaseLocalConfig(p.apiKey, p.projectId);
        return { apiKey: p.apiKey, projectId: p.projectId };
      }
    }
  } catch (err) {
    console.warn('[Firebase] Could not load failover config from cloud:', err);
  }

  return getFirebaseConfig();
}

/**
 * Save Firebase credentials to both localStorage and Supabase company_settings.
 * Syncs seamlessly across laptop, mobile, and tablets.
 */
export async function saveFirebaseConfigToCloud(
  config: FirebaseConfig,
  primaryEngine?: 'supabase' | 'firebase',
  updatedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    setFirebaseLocalConfig(config.apiKey, config.projectId);

    if (isSupabaseConfigured() && supabase) {
      const payload: CloudFailoverConfigRecord = {
        projectId: config.projectId.trim(),
        apiKey: config.apiKey.trim(),
        primaryEngine: primaryEngine || 'supabase',
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy || 'Admin'
      };

      const { error } = await supabase.from('company_settings').upsert({
        id: CLOUD_FAILOVER_CONFIG_ID,
        profile: payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      if (error) {
        console.warn('[Firebase] Cloud failover sync warning:', error);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Firebase] Failed to save credentials to cloud:', err);
    return { success: false, error: err?.message || 'Failed to sync credentials to cloud.' };
  }
}

export function isFirebaseConfigured(): boolean {
  return Boolean(getFirebaseConfig());
}

// Convert native JS values to Firestore REST field format
function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Convert Firestore REST field format to native JS values
function fromFirestoreValue(fieldVal: any): any {
  if (!fieldVal || typeof fieldVal !== 'object') return fieldVal;
  if ('stringValue' in fieldVal) return fieldVal.stringValue;
  if ('integerValue' in fieldVal) return parseInt(fieldVal.integerValue, 10);
  if ('doubleValue' in fieldVal) return parseFloat(fieldVal.doubleValue);
  if ('booleanValue' in fieldVal) return fieldVal.booleanValue;
  if ('nullValue' in fieldVal) return null;
  if ('arrayValue' in fieldVal) {
    return (fieldVal.arrayValue?.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in fieldVal) {
    const res: Record<string, any> = {};
    const innerFields = fieldVal.mapValue?.fields || {};
    for (const [k, v] of Object.entries(innerFields)) {
      res[k] = fromFirestoreValue(v);
    }
    return res;
  }
  return fieldVal;
}

function parseFirestoreDoc(doc: any): any {
  if (!doc || !doc.fields) return null;
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    res[k] = fromFirestoreValue(v);
  }
  // Extract document ID from full resource path
  if (doc.name) {
    const parts = doc.name.split('/');
    res.id = parts[parts.length - 1];
  }
  return res;
}

/**
 * Upsert a single document into a Firestore collection
 */
export async function firestoreUpsert(collection: string, docId: string, data: Record<string, any>): Promise<boolean> {
  const config = getFirebaseConfig();
  if (!config) return false;

  const sanitizedId = encodeURIComponent(String(docId).replace(/[\/\\]/g, '_'));
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${collection}/${sanitizedId}?key=${config.apiKey}`;

  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Firebase Mirror] Failed to upsert ${collection}/${docId}:`, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Firebase Mirror] Network error saving to ${collection}:`, err);
    return false;
  }
}

/**
 * Fetch all documents from a Firestore collection
 */
export async function firestoreGetAll(collection: string): Promise<any[]> {
  const config = getFirebaseConfig();
  if (!config) return [];

  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${collection}?pageSize=500&key=${config.apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Firebase Failover] Error fetching ${collection}: ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents)) return [];
    return data.documents.map(parseFirestoreDoc).filter(Boolean);
  } catch (err) {
    console.warn(`[Firebase Failover] Network error getting ${collection}:`, err);
    return [];
  }
}

/**
 * Delete a document from Firestore
 */
export async function firestoreDelete(collection: string, docId: string): Promise<boolean> {
  const config = getFirebaseConfig();
  if (!config) return false;

  const sanitizedId = encodeURIComponent(String(docId).replace(/[\/\\]/g, '_'));
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${collection}/${sanitizedId}?key=${config.apiKey}`;

  try {
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn(`[Firebase Mirror] Error deleting ${collection}/${docId}:`, err);
    return false;
  }
}

/**
 * Health check to verify Firestore connectivity
 */
export async function testFirestoreConnection(): Promise<{ success: boolean; message: string }> {
  const config = getFirebaseConfig();
  if (!config) {
    return { success: false, message: 'Firebase credentials are not configured.' };
  }

  try {
    const testDocId = '_health_ping';
    const writeOk = await firestoreUpsert('_system', testDocId, {
      ping: 'ok',
      timestamp: new Date().toISOString()
    });

    if (writeOk) {
      return { success: true, message: `Connected to Firebase project "${config.projectId}" successfully!` };
    }
    return { success: false, message: 'Could not write to Firebase Firestore. Check your API Key and Security Rules.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection test failed.' };
  }
}
