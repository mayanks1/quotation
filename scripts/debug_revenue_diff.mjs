import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dsyicahqdiavaidsjmvl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1xz2VR6veUpoVGMxjtC18Q_1CRofOJn';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTemOGvqyNNsVWnXXvM3IspYFzsuXUa3Fj7WIcCWR6JtpzP8zxDO2ib2EM5oW0K-_RhelagVAa0neX7/pub?gid=0&single=true&output=csv&t=" + Date.now();

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  const cleaned = String(dateStr).trim().replace(/\s+/g, "");

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

async function debugDiff() {
  // 1. Fetch CSV
  const res = await fetch(SHEET_CSV_URL);
  const csv = await res.text();
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = lines.map(parseCSVLine);

  let sheetTotal2026 = 0;
  let sheetCount2026 = 0;
  let allSheetTotal = 0;

  const sheet2026Records = [];

  for (let i = 1; i < rows.length; i++) {
    const c = rows[i];
    if (!c || c.length < 4) continue;
    const dateStr = c[0] || '';
    const client = c[1] || '';
    const amountVal = parseFloat(String(c[3] || '').replace(/[^\d.-]/g, "")) || 0;
    const dt = parseDate(dateStr);
    const yr = dt.getFullYear();

    allSheetTotal += amountVal;

    if (yr === 2026) {
      sheetTotal2026 += amountVal;
      sheetCount2026++;
      sheet2026Records.push({ row: i + 1, date: dateStr, client, amount: amountVal });
    }
  }

  console.log('Original Google Sheet 2026:', {
    count: sheetCount2026,
    total: sheetTotal2026,
    allSheetTotal
  });

  // 2. Fetch Supabase
  const { data: supaRows, error } = await supabase
    .from('payment_ledger')
    .select('*');

  if (error) {
    console.error('Supabase error:', error);
    return;
  }

  let supaTotal2026 = 0;
  let supaCount2026 = 0;
  let allSupaTotal = 0;

  for (const r of supaRows) {
    const amt = Number(r.total_amount) || 0;
    allSupaTotal += amt;
    const yr = new Date(r.date).getFullYear();
    if (yr === 2026) {
      supaTotal2026 += amt;
      supaCount2026++;
    }
  }

  console.log('Supabase Current:', {
    totalRows: supaRows.length,
    supaCount2026,
    supaTotal2026,
    allSupaTotal
  });

  console.log('Difference in 2026:', sheetTotal2026 - supaTotal2026);

  // Check local deltas in localStorage or if any rows had year parsing mismatch
  const yearDistribution = {};
  for (const r of supaRows) {
    const yr = new Date(r.date).getFullYear();
    yearDistribution[yr] = (yearDistribution[yr] || 0) + 1;
  }
  console.log('Supabase Year Distribution:', yearDistribution);
}

debugDiff();
