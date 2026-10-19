export const GAS_URL = "https://script.google.com/macros/s/AKfycbzbFiup_qy6QPd2ys9Ab90x_1sPa9lfYUidLSZPbBeyT8iAcUoHoQe5XeoEl9sOkSkEOA/exec";

export const SHEET_CSV_URL = () => 
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTemOGvqyNNsVWnXXvM3IspYFzsuXUa3Fj7WIcCWR6JtpzP8zxDO2ib2EM5oW0K-_RhelagVAa0neX7/pub?gid=0&single=true&output=csv&t=" + Date.now();

export interface LedgerRecord {
  id: string;
  date: string;
  client: string;
  size: string;
  amount: number;
  status: 'Received' | 'Partial' | 'Pending';
  paidAmount: number;
  pendingAmount: number;
  note: string;
  sheetRow?: number;
}

export function normalizeClient(n?: string | null): string {
  if (!n) return "Unknown";
  return n.toLowerCase().trim().split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function parseDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date(0);
  const cleaned = String(dateStr).trim().replace(/\s+/g, "");

  // Handle multi-day range format: e.g. "17-19/01/2026" or "5-7/06/2026"
  if (cleaned.includes("/") && cleaned.includes("-")) {
    const parts = cleaned.split("/");
    if (parts.length >= 3) {
      const range = parts[0];
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      const dayRange = range.split("-");
      const d = parseInt(dayRange[0], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d);
      }
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
        return new Date(y, m - 1, d);
      }
    }
  }

  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function getYear(d?: string | null): number | null {
  const dt = parseDate(d);
  return isNaN(dt.getTime()) ? null : dt.getFullYear();
}

export function formatDate(d?: string | null): string {
  if (!d) return "";
  const str = String(d).trim();
  if (str.includes("-") && str.includes("/")) return str;
  const dt = parseDate(str);
  if (isNaN(dt.getTime())) return str;
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

export function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

export function getLocalDeltas() {
  try {
    const raw = localStorage.getItem('tisha_local_deltas');
    return raw ? JSON.parse(raw) : { added: [], updated: {}, deleted: [] };
  } catch (e) {
    return { added: [], updated: {}, deleted: [] };
  }
}

export function saveLocalDeltas(deltas: any) {
  try {
    localStorage.setItem('tisha_local_deltas', JSON.stringify(deltas));
  } catch (e) {
    console.error(e);
  }
}

export function addLocalDeltaAdded(entry: LedgerRecord) {
  const deltas = getLocalDeltas();
  deltas.added = [entry, ...(deltas.added || []).filter((e: any) => e.id !== entry.id)];
  saveLocalDeltas(deltas);
}

export function addLocalDeltaUpdated(sheetRow: number, entry: Partial<LedgerRecord>) {
  const deltas = getLocalDeltas();
  if (!deltas.updated) deltas.updated = {};
  deltas.updated[sheetRow] = { ...entry, timestamp: Date.now() };
  saveLocalDeltas(deltas);
}

export function addLocalDeltaDeleted(sheetRow: number) {
  const deltas = getLocalDeltas();
  if (!deltas.deleted) deltas.deleted = [];
  if (!deltas.deleted.includes(sheetRow)) {
    deltas.deleted.push(sheetRow);
  }
  if (deltas.added) {
    deltas.added = deltas.added.filter((e: any) => e.sheetRow !== sheetRow);
  }
  if (deltas.updated) {
    delete deltas.updated[sheetRow];
  }
  saveLocalDeltas(deltas);
}

export async function fetchSheetData(): Promise<LedgerRecord[]> {
  let rows: any[] = [];

  // 1. Primary: Fetch real-time live data from Google Apps Script (Simple GET with cache-busting query param)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const gasUrl = GAS_URL.includes('?') ? `${GAS_URL}&t=${Date.now()}` : `${GAS_URL}?t=${Date.now()}`;
    const gasRes = await fetch(gasUrl, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (gasRes.ok) {
      const gasJson = await gasRes.json();
      if (gasJson && gasJson.success && Array.isArray(gasJson.data) && gasJson.data.length > 0) {
        rows = gasJson.data;
      }
    }
  } catch (_err) {
    // If GAS is unavailable or slow, silently fall back to published CSV
  }

  // 2. Fallback: Fetch published Google Sheet CSV (Simple GET without preflight headers)
  if (!rows || rows.length === 0) {
    const response = await fetch(SHEET_CSV_URL());
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
    }
    const csv = await response.text();
    const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
    rows = lines.map(parseCSVLine);
  }

  const records: LedgerRecord[] = [];
  const deltas = getLocalDeltas();

  // Skip row 0 (headers)
  for (let i = 1; i < rows.length; i++) {
    const rowNum = i + 1;

    // Filter out rows deleted locally
    if (deltas.deleted && deltas.deleted.includes(rowNum)) {
      continue;
    }

    const c = rows[i];
    if (!c || c.length < 4) continue;

    const rawStatus = (c[4] || "").toString().toLowerCase().trim();
    const amountVal = parseFloat(String(c[3] || '').replace(/[^\d.-]/g, "")) || 0;

    let status: 'Received' | 'Partial' | 'Pending' = "Pending";
    let paidAmount = 0;
    let pendingAmount = amountVal;

    if (rawStatus.includes("partial")) {
      status = "Partial";
      const match = rawStatus.match(/(\d+[\d,.]*)/);
      if (match) {
        paidAmount = parseFloat(match[1].replace(/,/g, "")) || 0;
      }
      if (paidAmount === 0 && amountVal > 0) {
        paidAmount = Math.round(amountVal / 2);
      }
      pendingAmount = Math.max(0, amountVal - paidAmount);
    } else if (c[1] && c[1].toLowerCase().includes("pending") && (c[1].includes("(") || c[1].includes("-"))) {
      const pendingMatch = c[1].toLowerCase().match(/(\d+)\s*(k|thousand)?\s*pending/i);
      if (pendingMatch) {
        let num = parseFloat(pendingMatch[1]) || 0;
        if (pendingMatch[2] === "k" || pendingMatch[2] === "thousand") num *= 1000;
        pendingAmount = Math.min(amountVal, num);
        paidAmount = Math.max(0, amountVal - pendingAmount);
        status = paidAmount > 0 ? "Partial" : "Pending";
      } else if (rawStatus === "received") {
        status = "Received";
        paidAmount = amountVal;
        pendingAmount = 0;
      }
    } else if (rawStatus === "received") {
      status = "Received";
      paidAmount = amountVal;
      pendingAmount = 0;
    } else {
      status = "Pending";
      paidAmount = 0;
      pendingAmount = amountVal;
    }

    const noteKey = getRecordKey(c[0], c[1], amountVal);
    const localNotes = getSavedNotes();
    const sheetNote = (c[5] || "").replace(/[\r"]/g, "").trim();
    const note = sheetNote || localNotes[noteKey] || "";

    let recordObj: LedgerRecord = {
      id: `row-${rowNum}`,
      date: c[0].replace(/[\r"]/g, "").trim(),
      client: normalizeClient(c[1]),
      size: (c[2] || "").trim(),
      amount: amountVal,
      status,
      paidAmount,
      pendingAmount,
      note,
      sheetRow: rowNum
    };

    if (deltas.updated && deltas.updated[rowNum]) {
      recordObj = { ...recordObj, ...deltas.updated[rowNum], sheetRow: rowNum };
    }

    records.push(recordObj);
  }

  // Merge newly added rows from local deltas
  if (deltas.added && deltas.added.length > 0) {
    const stillPendingAdditions: any[] = [];
    deltas.added.forEach((addedItem: any) => {
      const existsInPublished = records.some(r => 
        r.date === addedItem.date && 
        r.client.toLowerCase() === addedItem.client.toLowerCase() && 
        r.amount === addedItem.amount
      );
      if (!existsInPublished) {
        stillPendingAdditions.push(addedItem);
        records.push(addedItem);
      }
    });

    if (stillPendingAdditions.length !== deltas.added.length) {
      deltas.added = stillPendingAdditions;
      saveLocalDeltas(deltas);
    }
  }

  return records;
}

export function getSavedNotes() {
  try {
    const raw = localStorage.getItem('tisha_event_notes');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveEventNote(recordKey: string, noteText: string) {
  try {
    const notes = getSavedNotes();
    if (noteText && String(noteText).trim()) {
      notes[recordKey] = String(noteText).trim();
    } else {
      delete notes[recordKey];
    }
    localStorage.setItem('tisha_event_notes', JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save note to localStorage', e);
  }
}

export function getRecordKey(date?: string, client?: string, amount?: number) {
  return `${String(date || '').trim()}_${String(client || '').toLowerCase().trim()}_${amount || 0}`;
}

export async function addRecord(entry: {
  date: string;
  client: string;
  size?: string;
  amount: number | string;
  status: 'Received' | 'Partial' | 'Pending';
  paidAmount?: number | string;
  note?: string;
  sheetRow?: number;
  id?: string;
}) {
  let formattedStatus = entry.status;
  if (entry.status === 'Partial') {
    formattedStatus = `Partial: ${parseFloat(String(entry.paidAmount)) || 0}` as any;
  }

  const amt = parseFloat(String(entry.amount)) || 0;
  const paid = parseFloat(String(entry.paidAmount)) || (entry.status === 'Received' ? amt : 0);

  if (entry.note !== undefined) {
    saveEventNote(getRecordKey(entry.date, entry.client, amt), entry.note);
  }

  addLocalDeltaAdded({
    id: entry.id || `local-${Date.now()}`,
    date: entry.date,
    client: normalizeClient(entry.client),
    size: entry.size || '',
    amount: amt,
    status: entry.status,
    paidAmount: paid,
    pendingAmount: Math.max(0, amt - paid),
    note: entry.note || '',
    sheetRow: entry.sheetRow || 9999
  });

  const payload = {
    action: "add",
    date: entry.date,
    client: entry.client,
    size: entry.size || "",
    amount: entry.amount,
    status: formattedStatus,
    note: entry.note || ""
  };

  const res = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res;
}

export async function updateRecord(entry: {
  date: string;
  client: string;
  size?: string;
  amount: number | string;
  status: 'Received' | 'Partial' | 'Pending';
  paidAmount?: number | string;
  note?: string;
}, sheetRow: number) {
  let formattedStatus = entry.status;
  if (entry.status === 'Partial') {
    formattedStatus = `Partial: ${parseFloat(String(entry.paidAmount)) || 0}` as any;
  }

  const amt = parseFloat(String(entry.amount)) || 0;
  const paid = parseFloat(String(entry.paidAmount)) || (entry.status === 'Received' ? amt : 0);

  if (entry.note !== undefined) {
    saveEventNote(getRecordKey(entry.date, entry.client, amt), entry.note);
  }

  addLocalDeltaUpdated(sheetRow, {
    date: entry.date,
    client: normalizeClient(entry.client),
    size: entry.size || '',
    amount: amt,
    status: entry.status,
    paidAmount: paid,
    pendingAmount: Math.max(0, amt - paid),
    note: entry.note || ''
  });

  const payload = {
    action: "update",
    row: sheetRow,
    date: entry.date,
    client: entry.client,
    size: entry.size || "",
    amount: entry.amount,
    status: formattedStatus,
    note: entry.note || ""
  };

  const res = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res;
}

export async function saveQuickNote(record: LedgerRecord, note: string) {
  saveEventNote(getRecordKey(record.date, record.client, record.amount), note);
  if (record.sheetRow) {
    addLocalDeltaUpdated(record.sheetRow, { note });
  }
  try {
    let formattedStatus = record.status;
    if (record.status === 'Partial') {
      formattedStatus = `Partial: ${parseFloat(String(record.paidAmount)) || 0}` as any;
    }
    const payload = {
      action: "update",
      row: record.sheetRow,
      date: record.date,
      client: record.client,
      size: record.size,
      amount: record.amount,
      status: formattedStatus,
      note: note || ""
    };
    await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("GAS quick note sync warning", err);
  }
}

export async function deleteRecord(sheetRow: number) {
  addLocalDeltaDeleted(sheetRow);
  const payload = {
    action: "delete",
    row: sheetRow
  };
  const res = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res;
}
