import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Quotation, getItemAmount } from '../types/quotation';
import { failoverManager } from './failoverManager';

export interface LedgerRecord {
  id: string;
  date: string; // Display format (DD/MM/YYYY)
  isoDate?: string; // Standard format (YYYY-MM-DD)
  client: string;
  size: string;
  amount: number;
  status: 'Received' | 'Partial' | 'Pending';
  paidAmount: number;
  pendingAmount: number;
  note: string;
  // Soft-delete & 30-day retention
  isDeleted?: boolean;
  deletedAt?: string;
  // Supabase Database Fields
  linkedQuotationId?: string | null;
  invoiceNumber?: string | null;
  paymentMode?: string;
  transactionRef?: string;
  eventVenue?: string;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
}

const LEDGER_STORAGE_KEY = 'tisha_supabase_ledger_cache_v1';
const LEDGER_TRASH_KEY = 'tisha_supabase_ledger_trash_v1';

// In-memory cache for immediate zero-latency UI rendering
let memoryLedgerRecords: LedgerRecord[] = [];

export function normalizeClient(n?: string | null): string {
  if (!n) return "Unknown";
  return n.toLowerCase().trim().split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function parseDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date(0);
  const rawStr = String(dateStr).trim();
  
  // Handle text range like "24-10-2026 to 26-10-2026" or "24/10/2026 to 26/10/2026"
  if (rawStr.toLowerCase().includes(" to ")) {
    const startPart = rawStr.toLowerCase().split(" to ")[0].trim();
    return parseDate(startPart);
  }

  // Handle dash range with spaces like "23/10/2026 - 25/10/2026"
  if (rawStr.includes(" - ")) {
    const startPart = rawStr.split(" - ")[0].trim();
    return parseDate(startPart);
  }

  const cleaned = rawStr.replace(/\s+/g, "");

  // Handle multi-day range format: e.g. "17-19/01/2026" or "23-25/10/2026"
  if (cleaned.includes("/") && cleaned.includes("-")) {
    const parts = cleaned.split("/");
    if (parts.length >= 3) {
      const range = parts[0];
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      const dayRange = range.split("-");
      const d = parseInt(dayRange[0], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y < 100 ? 2000 + y : y, m - 1, d);
      }
    }
  }

  // Handle dot-separated dates: "DD.MM.YYYY"
  if (cleaned.includes(".") && !cleaned.includes("/") && !cleaned.includes("-")) {
    const parts = cleaned.split(".");
    if (parts.length >= 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y < 100 ? 2000 + y : y, m - 1, d);
      }
    }
  }

  // Handle dash range format: e.g. "17-19-10-2026"
  if (cleaned.includes("-") && cleaned.split("-").length === 4) {
    const parts = cleaned.split("-");
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[2], 10);
    const y = parseInt(parts[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y < 100 ? 2000 + y : y, m - 1, d);
    }
  }

  // Handle standard "DD/MM/YYYY" or "D/M/YYYY"
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/");
    if (parts.length >= 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y < 100 ? 2000 + y : y, m - 1, d);
      }
    }
  }

  // Handle dash-separated dates: "YYYY-MM-DD" (ISO) or "DD-MM-YYYY" (Indian)
  if (cleaned.includes("-") && !cleaned.includes("/")) {
    // If it has ISO time component (e.g. 2026-10-18T...), take date part
    const datePart = cleaned.split("T")[0];
    const parts = datePart.split("-");
    if (parts.length >= 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        // Distinguish DD-MM-YYYY from YYYY-MM-DD:
        // If first segment is ≤31 and last segment is ≥100 (or ≥1900) → DD-MM-YYYY
        // If first segment is ≥100 (or ≥1900) → YYYY-MM-DD
        if (p0 <= 31 && p2 >= 100) {
          // DD-MM-YYYY format (Indian standard)
          return new Date(p2, p1 - 1, p0);
        } else if (p0 >= 100) {
          // YYYY-MM-DD format (ISO standard)
          return new Date(p0, p1 - 1, p2);
        } else {
          // Ambiguous short year – treat as DD-MM-YY
          const fullYear = p2 < 100 ? (p2 < 50 ? 2000 + p2 : 1900 + p2) : p2;
          return new Date(fullYear, p1 - 1, p0);
        }
      }
    }
  }

  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function getYear(d?: string | null): number | null {
  const dt = parseDate(d);
  if (isNaN(dt.getTime())) return null;
  const y = dt.getFullYear();
  // Filter out invalid/corrupted pre-2000 dates from yearly analytics
  if (y < 2000 || y > 2100) return null;
  return y;
}

export function formatDate(d?: string | null): string {
  if (!d) return "";
  const str = String(d).trim();
  if (str.includes("-") && str.includes("/")) return str;
  if (str.toLowerCase().includes(" to ")) return str;
  if (str.includes(" - ")) return str;
  if (str.includes("-") && str.split("-").length > 3) return str;
  const dt = parseDate(str);
  if (isNaN(dt.getTime())) return str;
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

export function parseDateToISO(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const dt = parseDate(dateStr);
  if (isNaN(dt.getTime()) || dt.getTime() === 0) {
    return new Date().toISOString().split('T')[0];
  }
  const year = dt.getFullYear();
  if (year < 2000 || year > 2100) {
    return new Date().toISOString().split('T')[0];
  }
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Convert database row to UI LedgerRecord
export function fromDbRow(row: any, index: number = 0): LedgerRecord {
  const total = Number(row.total_amount) || 0;
  const paid = Number(row.paid_amount) || 0;
  const pending = row.pending_amount !== undefined && row.pending_amount !== null
    ? Number(row.pending_amount)
    : Math.max(0, total - paid);

  // Auto-heal dates that have invalid historical years (< 2000)
  let rawDate = row.date;
  const parsedDt = parseDate(rawDate);
  if (!isNaN(parsedDt.getTime()) && parsedDt.getFullYear() < 2000 && parsedDt.getFullYear() > 1900) {
    const recoveryYear = row.created_at ? new Date(row.created_at).getFullYear() : 2026;
    const safeYear = recoveryYear >= 2000 && recoveryYear <= 2100 ? recoveryYear : 2026;
    const m = String(parsedDt.getMonth() + 1).padStart(2, '0');
    const d = String(parsedDt.getDate()).padStart(2, '0');
    rawDate = `${safeYear}-${m}-${d}`;
  }

  // Extract custom display date (e.g. "23-25/10/2026") from notes tag or client_id
  let displayDate = '';
  let cleanNotes = row.notes || '';

  // 1. Check notes for [EventDate: ...] tag
  if (cleanNotes.includes('[EventDate:')) {
    const match = cleanNotes.match(/\[EventDate:\s*([^\]]+)\]/i);
    if (match && match[1]) {
      displayDate = match[1].trim();
      cleanNotes = cleanNotes.replace(/\s*\[EventDate:[^\]]+\]/gi, '').trim();
    }
  }

  // 2. Check client_id column (which stores exact date/range string)
  if (!displayDate && row.client_id && typeof row.client_id === 'string') {
    const cid = row.client_id.trim();
    if (cid.includes('/') || cid.includes('-') || cid.includes(' to ')) {
      displayDate = cid;
    }
  }

  // 3. Fallback to formatting rawDate
  if (!displayDate) {
    displayDate = formatDate(rawDate);
  }

  // Clean note from default imported labels
  if (cleanNotes.startsWith('Imported from Google Sheet') || cleanNotes.startsWith('Imported historical record')) {
    cleanNotes = '';
  }

  // Clean and sanitize any historical over-long screen_size descriptions
  let cleanSize = (row.screen_size || '').trim();
  if (cleanSize.length > 35 && (cleanSize.includes(' - ') || cleanSize.includes('('))) {
    cleanSize = cleanSize.split(/[\n\r]|(?:\s+-\s+)|\s*\(|\s+with\s+/i)[0].trim();
  }

  return {
    id: row.id,
    date: displayDate,
    isoDate: rawDate,
    client: normalizeClient(row.client_name || 'Direct Client'),
    size: cleanSize,
    amount: total,
    paidAmount: paid,
    pendingAmount: pending,
    status: (row.status as any) || (paid >= total ? 'Received' : paid > 0 ? 'Partial' : 'Pending'),
    note: cleanNotes,
    sheetRow: index + 1,
    linkedQuotationId: row.linked_quotation_id || null,
    invoiceNumber: row.invoice_number || null,
    paymentMode: row.payment_mode || 'unpaid',
    transactionRef: row.transaction_ref || '',
    eventVenue: row.event_venue || '',
    organizationId: row.organization_id || 'org_tisha_main',
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Convert UI LedgerRecord / form input to database row
export function toDbRow(entry: {
  id?: string;
  date: string;
  client: string;
  size?: string;
  amount: number | string;
  status: 'Received' | 'Partial' | 'Pending';
  paidAmount?: number | string;
  note?: string;
  paymentMode?: string;
  transactionRef?: string;
  eventVenue?: string;
  linkedQuotationId?: string | null;
  invoiceNumber?: string | null;
  organizationId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}) {
  const amt = parseFloat(String(entry.amount)) || 0;
  const paid = entry.status === 'Received'
    ? amt
    : (entry.status === 'Partial' ? (parseFloat(String(entry.paidAmount)) || 0) : 0);

  const cleanDateInput = String(entry.date || '').trim();

  // Preserve the exact formatted date string (like "23-25/10/2026" or "23 to 25/10/2026")
  let updatedNotes = entry.note?.trim() || '';
  if (cleanDateInput) {
    // Strip any old [EventDate: ...] tag first
    updatedNotes = updatedNotes.replace(/\s*\[EventDate:[^\]]+\]/gi, '').trim();
    updatedNotes = updatedNotes ? `${updatedNotes} [EventDate: ${cleanDateInput}]` : `[EventDate: ${cleanDateInput}]`;
  }

  return {
    id: entry.id || `led_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    organization_id: entry.organizationId || 'org_tisha_main',
    date: parseDateToISO(cleanDateInput),
    client_name: normalizeClient(entry.client),
    client_id: cleanDateInput, // Preserves the exact display date / range in Supabase!
    screen_size: entry.size?.trim() || '',
    total_amount: Math.round(amt * 100) / 100,
    paid_amount: Math.round(paid * 100) / 100,
    status: entry.status,
    notes: updatedNotes,
    payment_mode: entry.paymentMode || (entry.status === 'Received' ? 'bank_transfer' : 'unpaid'),
    transaction_ref: entry.transactionRef || null,
    event_venue: entry.eventVenue || null,
    linked_quotation_id: entry.linkedQuotationId || null,
    invoice_number: entry.invoiceNumber || null,
    updated_at: new Date().toISOString()
  };
}

// 1. Fetch all ledger records (Supabase Primary + Local Cache Fallback)
export async function fetchLedgerRecords(): Promise<LedgerRecord[]> {
  // Purge any trashed records older than 30 days
  purgeExpiredTrash();

  const trashedIds = new Set(getTrashedRecords().map(r => r.id));

  // Try loading cached records first for instant display
  if (memoryLedgerRecords.length === 0) {
    try {
      const cached = localStorage.getItem(LEDGER_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryLedgerRecords = parsed
            .map((r: LedgerRecord) => {
              const dt = parseDate(r.date);
              if (!isNaN(dt.getTime()) && dt.getFullYear() < 2000 && dt.getFullYear() > 1900) {
                const safeYear = 2026;
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                return { ...r, date: `${d}/${m}/${safeYear}`, isoDate: `${safeYear}-${m}-${d}` };
              }
              return r;
            })
            .filter((r: LedgerRecord) => !r.isDeleted && !trashedIds.has(r.id));
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('payment_ledger')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.warn('Supabase fetch ledger warning:', error.message);
        failoverManager.reportSupabaseFailure(error);
      } else if (data) {
        failoverManager.reportSupabaseSuccess();
        const formatted = data
          .map((row, idx) => fromDbRow(row, idx))
          .filter(r => !r.isDeleted && !trashedIds.has(r.id));

        // Auto-recover any un-synced local entries added in the browser before the migration
        try {
          const rawDeltas = typeof window !== 'undefined' ? localStorage.getItem('tisha_local_deltas') : null;
          if (rawDeltas) {
            const deltas = JSON.parse(rawDeltas);
            if (deltas && Array.isArray(deltas.added) && deltas.added.length > 0) {
              for (const item of deltas.added) {
                if (!item || !item.amount) continue;
                const cleanClient = normalizeClient(item.client);
                const amt = parseFloat(String(item.amount)) || 0;
                const dateStr = formatDate(item.date);

                const exists = formatted.some(r =>
                  r.client.toLowerCase() === cleanClient.toLowerCase() &&
                  Math.abs(r.amount - amt) < 1 &&
                  r.date === dateStr
                );

                if (!exists && !trashedIds.has(item.id)) {
                  const row = toDbRow({
                    ...item,
                    id: item.id || `led_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    amount: amt,
                    paidAmount: item.paidAmount || (item.status === 'Received' ? amt : 0)
                  });
                  supabase.from('payment_ledger').upsert(row).then();
                  formatted.unshift(fromDbRow(row, 0));
                }
              }
            }
          }
        } catch (e) {
          console.warn('Local delta recovery error:', e);
        }

        memoryLedgerRecords = formatted;
        try {
          localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(formatted));
        } catch (e) {
          // ignore
        }
        return formatted;
      }
    } catch (err) {
      console.warn('Failed to fetch ledger from Supabase:', err);
      failoverManager.reportSupabaseFailure(err);

      // Automatic 0% downtime fallback: Retrieve from Firebase Firestore
      try {
        const fallbackLedger = await failoverManager.getFallbackLedger();
        if (fallbackLedger && fallbackLedger.length > 0) {
          console.log(`[Failover] Recovered ${fallbackLedger.length} ledger records from Firebase secondary storage!`);
          memoryLedgerRecords = fallbackLedger.filter(r => !r.isDeleted && !trashedIds.has(r.id));
          return memoryLedgerRecords;
        }
      } catch (fbErr) {
        console.warn('Firebase ledger fallback error:', fbErr);
      }
    }
  }

  return memoryLedgerRecords.filter(r => !r.isDeleted && !trashedIds.has(r.id));
}

// Alias for seamless backward compatibility with existing components
export const fetchSheetData = fetchLedgerRecords;

// 2. Add New Ledger Record
export async function addRecord(entry: {
  date: string;
  client: string;
  size?: string;
  amount: number | string;
  status: 'Received' | 'Partial' | 'Pending';
  paidAmount?: number | string;
  note?: string;
  paymentMode?: string;
  transactionRef?: string;
  eventVenue?: string;
  id?: string;
  sheetRow?: number;
}): Promise<LedgerRecord> {
  const row = toDbRow(entry);
  const formattedRecord = fromDbRow(row, memoryLedgerRecords.length);

  // Optimistic memory update
  memoryLedgerRecords = [formattedRecord, ...memoryLedgerRecords];
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(memoryLedgerRecords));
  } catch (e) {}

  // Sync to Supabase
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('payment_ledger').insert([row]);
    if (error) {
      console.error('Supabase addRecord error:', error.message);
      failoverManager.reportSupabaseFailure(error);
      throw new Error(error.message);
    } else {
      failoverManager.reportSupabaseSuccess();
    }
  }

  // Background mirror to Firebase Firestore
  failoverManager.mirrorLedgerRecord(formattedRecord).catch(() => {});

  return formattedRecord;
}

// 3. Update Existing Ledger Record
export async function updateRecord(
  entry: {
    id?: string;
    date: string;
    client: string;
    size?: string;
    amount: number | string;
    status: 'Received' | 'Partial' | 'Pending';
    paidAmount?: number | string;
    note?: string;
    paymentMode?: string;
    transactionRef?: string;
    eventVenue?: string;
    linkedQuotationId?: string | null;
    invoiceNumber?: string | null;
  },
  recordIdOrRow?: string | number
): Promise<LedgerRecord> {
  const targetId = entry.id || (typeof recordIdOrRow === 'string' ? recordIdOrRow : undefined);

  // Find existing record
  const existing = memoryLedgerRecords.find(r => r.id === targetId || (recordIdOrRow && r.sheetRow === recordIdOrRow));
  const finalId = targetId || existing?.id || `led_${Date.now()}`;

  const row = toDbRow({ ...entry, id: finalId });
  const updatedRecord = fromDbRow(row, existing ? (existing.sheetRow || 1) - 1 : 0);

  // Optimistic memory update
  memoryLedgerRecords = memoryLedgerRecords.map(r => r.id === finalId ? updatedRecord : r);
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(memoryLedgerRecords));
  } catch (e) {}

  // Sync to Supabase
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('payment_ledger')
      .update(row)
      .eq('id', finalId);

    if (error) {
      console.error('Supabase updateRecord error:', error.message);
      failoverManager.reportSupabaseFailure(error);
      throw new Error(error.message);
    } else {
      failoverManager.reportSupabaseSuccess();
    }
  }

  // Background mirror to Firebase Firestore
  failoverManager.mirrorLedgerRecord(updatedRecord).catch(() => {});

  return updatedRecord;
}

// Helper: calculate days remaining in 30-day retention window
export function getDaysRemainingInTrash(deletedAt?: string): number {
  if (!deletedAt) return 30;
  const deletedMs = new Date(deletedAt).getTime();
  const elapsedDays = Math.floor((Date.now() - deletedMs) / (24 * 60 * 60 * 1000));
  return Math.max(0, 30 - elapsedDays);
}

// Get all trashed ledger records
export function getTrashedRecords(): LedgerRecord[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LEDGER_TRASH_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading ledger trash:', e);
  }
  return [];
}

// Save trashed records to persistent storage
export function saveTrashedRecords(trashed: LedgerRecord[]): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LEDGER_TRASH_KEY, JSON.stringify(trashed));
    }
  } catch (e) {
    console.warn('Error saving ledger trash:', e);
  }
}

// Automatically purge records older than 30 days
export function purgeExpiredTrash(): void {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const trashed = getTrashedRecords();
  const valid: LedgerRecord[] = [];
  const expired: LedgerRecord[] = [];

  for (const r of trashed) {
    if (r.deletedAt) {
      const deletedTime = new Date(r.deletedAt).getTime();
      if (now - deletedTime > THIRTY_DAYS_MS) {
        expired.push(r);
        continue;
      }
    }
    valid.push(r);
  }

  if (expired.length > 0) {
    saveTrashedRecords(valid);
    // Also clean up any lingering Supabase rows for expired items
    if (isSupabaseConfigured() && supabase) {
      for (const exp of expired) {
        if (exp.id) {
          supabase.from('payment_ledger').delete().eq('id', exp.id).then();
        }
      }
    }
  }
}

// Move record to Trash with 30-day retention
export async function moveToTrash(recordIdOrRow: string | number): Promise<LedgerRecord | null> {
  const existing = memoryLedgerRecords.find(
    r => r.id === recordIdOrRow || (typeof recordIdOrRow === 'number' && r.sheetRow === recordIdOrRow)
  );
  const targetId = typeof recordIdOrRow === 'string' ? recordIdOrRow : existing?.id;
  if (!existing && !targetId) return null;

  const targetRecord = existing || ({ id: targetId } as LedgerRecord);
  const trashedRecord: LedgerRecord = {
    ...targetRecord,
    isDeleted: true,
    deletedAt: new Date().toISOString()
  };

  // Remove from active memory
  memoryLedgerRecords = memoryLedgerRecords.filter(
    r => r.id !== targetId && (typeof recordIdOrRow !== 'number' || r.sheetRow !== recordIdOrRow)
  );
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(memoryLedgerRecords));
    }
  } catch (e) {}

  // Add to trash list
  const currentTrash = getTrashedRecords().filter(r => r.id !== targetId);
  saveTrashedRecords([trashedRecord, ...currentTrash]);

  // Remove from active Supabase table (so it doesn't appear in calculations or main queries)
  if (targetId && isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('payment_ledger')
        .delete()
        .eq('id', targetId);

      if (error) {
        console.warn('Supabase moveToTrash delete error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase moveToTrash sync warning:', err);
    }
  }

  // Delete from Firebase secondary mirror
  if (targetId) {
    failoverManager.deleteMirroredLedgerRecord(targetId).catch(() => {});
  }

  return trashedRecord;
}

// Restore a trashed record back to active ledger and Supabase
export async function restoreFromTrash(id: string): Promise<LedgerRecord | null> {
  const currentTrash = getTrashedRecords();
  const trashed = currentTrash.find(r => r.id === id);
  if (!trashed) return null;

  const restoredRecord: LedgerRecord = {
    ...trashed,
    isDeleted: false,
    deletedAt: undefined,
    updatedAt: new Date().toISOString()
  };

  // Remove from trash list
  const updatedTrash = currentTrash.filter(r => r.id !== id);
  saveTrashedRecords(updatedTrash);

  // Add back to active memory
  memoryLedgerRecords = [restoredRecord, ...memoryLedgerRecords.filter(r => r.id !== id)];
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(memoryLedgerRecords));
    }
  } catch (e) {}

  // Re-insert / Upsert into Supabase payment_ledger
  if (isSupabaseConfigured() && supabase) {
    try {
      const row = toDbRow(restoredRecord);
      const { error } = await supabase.from('payment_ledger').upsert(row);
      if (error) {
        console.error('Supabase restoreFromTrash error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase restoreFromTrash warning:', err);
    }
  }

  return restoredRecord;
}

// Permanently delete a single record from trash and Supabase
export async function permanentlyDeleteRecord(id: string): Promise<void> {
  // Remove from trash
  const currentTrash = getTrashedRecords().filter(r => r.id !== id);
  saveTrashedRecords(currentTrash);

  // Remove from active memory
  memoryLedgerRecords = memoryLedgerRecords.filter(r => r.id !== id);
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(memoryLedgerRecords));
    }
  } catch (e) {}

  // Delete from Supabase
  if (id && isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('payment_ledger').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase permanentlyDeleteRecord error:', err);
    }
  }
}

// Empty entire trash permanently
export async function emptyTrash(): Promise<void> {
  const currentTrash = getTrashedRecords();
  saveTrashedRecords([]);

  if (isSupabaseConfigured() && supabase) {
    const ids = currentTrash.map(r => r.id).filter(Boolean);
    if (ids.length > 0) {
      try {
        await supabase.from('payment_ledger').delete().in('id', ids);
      } catch (err) {
        console.warn('Supabase emptyTrash error:', err);
      }
    }
  }
}

// 4. Delete Ledger Record (Default moves to 30-day trash for safety)
export async function deleteRecord(recordIdOrRow: string | number): Promise<void> {
  await moveToTrash(recordIdOrRow);
}

// 5. Quick Note Update
export async function saveQuickNote(record: LedgerRecord, note: string): Promise<void> {
  // Update memory
  memoryLedgerRecords = memoryLedgerRecords.map(r => {
    if (r.id === record.id || (record.sheetRow && r.sheetRow === record.sheetRow)) {
      return { ...r, note };
    }
    return r;
  });

  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(memoryLedgerRecords));
  } catch (e) {}

  // Sync to Supabase
  if (record.id && isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('payment_ledger')
      .update({ notes: note, updated_at: new Date().toISOString() })
      .eq('id', record.id);

    if (error) {
      console.error('Supabase saveQuickNote error:', error.message);
    }
  }
}

// Helper to extract clean, concise screen size / dimensions from line items for the ledger
export function extractScreenSize(lineItems?: LineItem[]): string {
  if (!lineItems || lineItems.length === 0) return 'Standard LED Setup';

  const sizes: string[] = [];

  for (const item of lineItems) {
    // 1. Explicit dimensions if set
    if (item.dimensions?.widthFt && item.dimensions?.heightFt) {
      sizes.push(`${item.dimensions.widthFt}x${item.dimensions.heightFt} ft`);
      continue;
    }
    if (item.dimensions?.sqFt) {
      sizes.push(`${item.dimensions.sqFt} sqft`);
      continue;
    }

    const desc = (item.description || '').trim();
    if (!desc) continue;

    // 2. Regex for dimension patterns like "12x8", "16 x 10 ft", "100ft", "100 sqft"
    const dimMatch = desc.match(/\b(\d+[\s]*[xX×*][\s]*\d+(?:\s*(?:ft|feet|m|meter))?)\b/i);
    const sqftMatch = desc.match(/\b(\d+[\s]*(?:sq\.?ft|sqft|ft|feet))\b/i);
    const pitchMatch = desc.match(/\b(P\d+(?:\.\d+)?)\b/i);

    if (dimMatch) {
      const dim = dimMatch[1].replace(/\s+/g, '');
      sizes.push(pitchMatch ? `${pitchMatch[1]} ${dim}` : dim);
    } else if (sqftMatch) {
      const sqft = sqftMatch[1].replace(/\s+/g, '');
      sizes.push(pitchMatch ? `${pitchMatch[1]} ${sqft}` : sqft);
    } else {
      // 3. Fallback: extract clean short model name (before ' - ', ' (', '\n', or 'with')
      let shortTitle = desc.split(/[\n\r]|(?:\s+-\s+)|\s*\(|\s+with\s+/i)[0].trim();
      if (shortTitle.length > 25) {
        shortTitle = shortTitle.slice(0, 22).trim() + '...';
      }
      if (shortTitle) {
        sizes.push(shortTitle);
      }
    }
  }

  if (sizes.length === 0) {
    return `${lineItems.length} Screen${lineItems.length > 1 ? 's' : ''}`;
  }

  const unique = [...new Set(sizes)];
  return unique.slice(0, 2).join(', ');
}

// Find if a quotation is currently in ledger trash
export function findTrashedLedgerRecord(quotationId: string, quotationNumber?: string): LedgerRecord | null {
  const trashed = getTrashedRecords();
  return trashed.find(r => 
    r.linkedQuotationId === quotationId || 
    r.id === `led_inv_${quotationId}` ||
    (quotationNumber && (
      r.invoiceNumber === quotationNumber ||
      (r.note && r.note.includes(quotationNumber))
    ))
  ) || null;
}

// 6. Quotation-to-Ledger Bridge: Sync Invoiced Quotation Automatically or Manually
export async function syncInvoicedQuotation(
  quotation: Quotation, 
  force: boolean = false
): Promise<{ success: boolean; isTrash?: boolean; message: string }> {
  // Check if this quotation entry was moved to Ledger Trash
  const trashedRecord = findTrashedLedgerRecord(quotation.id, quotation.quotationNumber);
  if (trashedRecord) {
    return {
      success: false,
      isTrash: true,
      message: 'Already copied! This entry is in Ledger Trash. Please restore it from Ledger Trash or first delete it from Ledger Trash, and then sync from here.'
    };
  }

  // Guard clause: Only create/update ledger entry if quotation is formally invoiced or forced
  const isInvoiced = quotation.status === 'invoiced' || Boolean(quotation.invoiceNumber) || quotation.documentType === 'invoice';

  if (!isInvoiced && !force) {
    return {
      success: true,
      message: 'Quotation is not invoiced. Skipped auto-sync.'
    };
  }

  // Calculate quotation financials
  const subtotal = quotation.lineItems.reduce((acc, item) => acc + getItemAmount(item), 0);
  const discounted = Math.max(0, subtotal - (quotation.discountAmount || 0));
  const isZeroTax = quotation.taxScheme === 'none';
  const taxRate = isZeroTax ? 0 : (quotation.taxRate || 18);
  const taxAmount = (discounted * taxRate) / 100;
  const grandTotal = Math.round(discounted + taxAmount + (quotation.shippingCharges || 0) + (quotation.adjustmentAmount || 0));

  const paidAmount = Number(quotation.paidAmount) || 0;
  let status: 'Received' | 'Partial' | 'Pending' = 'Pending';
  if (paidAmount >= grandTotal && grandTotal > 0) {
    status = 'Received';
  } else if (paidAmount > 0) {
    status = 'Partial';
  }

  const invoiceNum = quotation.invoiceNumber || quotation.quotationNumber;
  const eventDateRange = quotation.eventDate || '';
  const invoiceDateStr = quotation.eventDate || quotation.invoiceDate || quotation.quotationDate;

  const ledgerPayload = {
    id: `led_inv_${quotation.id}`,
    linked_quotation_id: quotation.id,
    invoice_number: invoiceNum,
    organization_id: 'org_tisha_main',
    date: parseDateToISO(invoiceDateStr),
    client_name: normalizeClient(quotation.client?.company || quotation.client?.name || 'Direct Client'),
    client_id: eventDateRange || null,
    event_venue: quotation.venue || null,
    screen_size: extractScreenSize(quotation.lineItems),
    total_amount: grandTotal,
    paid_amount: paidAmount,
    status: status,
    payment_mode: quotation.paymentMode || (status === 'Received' ? 'bank_transfer' : 'unpaid'),
    transaction_ref: quotation.transactionRef || null,
    notes: `Official Tax Invoice #${invoiceNum} (Ref Quote #${quotation.quotationNumber})${eventDateRange ? ` [EventDate: ${eventDateRange}]` : ''}`,
    updated_at: new Date().toISOString()
  };

  // Upsert to Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('payment_ledger')
        .upsert(ledgerPayload, { onConflict: 'linked_quotation_id' });

      if (error) {
        console.warn('Failed to upsert invoiced quotation to ledger:', error.message);
      }
    } catch (err) {
      console.warn('Supabase syncInvoicedQuotation warning:', err);
    }
  }

  // Also update local memory ledger
  const formatted = fromDbRow(ledgerPayload, 0);
  const existingIdx = memoryLedgerRecords.findIndex(r => r.linkedQuotationId === quotation.id || r.id === ledgerPayload.id);
  if (existingIdx >= 0) {
    memoryLedgerRecords[existingIdx] = { ...memoryLedgerRecords[existingIdx], ...formatted };
  } else {
    memoryLedgerRecords = [formatted, ...memoryLedgerRecords];
  }
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(memoryLedgerRecords));
  } catch (e) {}

  return {
    success: true,
    message: `Quotation ${quotation.quotationNumber} synced to Payment Ledger successfully.`
  };
}

// 7. Handle Quotation Deletion: Remove linked ledger record if deleted
export async function handleQuotationDeleted(quotationId: string): Promise<void> {
  memoryLedgerRecords = memoryLedgerRecords.filter(r => r.linkedQuotationId !== quotationId);
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(memoryLedgerRecords));
  } catch (e) {}

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('payment_ledger')
        .delete()
        .eq('linked_quotation_id', quotationId);
    } catch (err) {
      console.warn('Failed deleting linked ledger record:', err);
    }
  }
}

// 8. Real-time Subscription to Ledger Changes
export function subscribeToLedgerChanges(onUpdate: () => void): () => void {
  if (!isSupabaseConfigured() || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('public:payment_ledger')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payment_ledger' },
      () => {
        // Refresh memory cache and notify UI
        fetchLedgerRecords().then(() => onUpdate());
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
