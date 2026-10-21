import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dsyicahqdiavaidsjmvl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1xz2VR6veUpoVGMxjtC18Q_1CRofOJn';

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTemOGvqyNNsVWnXXvM3IspYFzsuXUa3Fj7WIcCWR6JtpzP8zxDO2ib2EM5oW0K-_RhelagVAa0neX7/pub?gid=0&single=true&output=csv&t=" + Date.now();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

function normalizeClient(n) {
  if (!n) return "Unknown";
  return n.toLowerCase().trim().split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseDateToISO(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const cleaned = String(dateStr).trim().replace(/\s+/g, "");

  // Handle multi-day range: e.g. "17-19/01/2026"
  if (cleaned.includes("/") && cleaned.includes("-")) {
    const parts = cleaned.split("/");
    if (parts.length >= 3) {
      const range = parts[0];
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      const dayRange = range.split("-");
      const d = parseInt(dayRange[0], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
  }

  const dt = new Date(cleaned);
  return isNaN(dt.getTime()) ? new Date().toISOString().split('T')[0] : dt.toISOString().split('T')[0];
}

async function runMigration() {
  console.log('=====================================================');
  console.log('🔄 TISHA LED WALLS: Google Sheet ➔ Supabase Migration');
  console.log('=====================================================');
  console.log('Target Supabase URL:', SUPABASE_URL);

  // 1. Fetch CSV from Google Sheets
  console.log('\n📥 Step 1: Downloading CSV from Google Sheet...');
  let csvText = '';
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    csvText = await res.text();
    console.log(`✅ Downloaded ${(csvText.length / 1024).toFixed(1)} KB from Google Sheet.`);
  } catch (err) {
    console.error('❌ Failed to download sheet CSV:', err.message);
    process.exit(1);
  }

  // 2. Parse CSV into records
  console.log('\n🔍 Step 2: Parsing rows into Ledger records...');
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const rows = lines.map(parseCSVLine);

  console.log(`Found ${rows.length} total rows (including header).`);

  const ledgerRecords = [];

  for (let i = 1; i < rows.length; i++) {
    const c = rows[i];
    if (!c || c.length < 4) continue;

    const rawDate = c[0] || '';
    const rawClient = c[1] || '';
    const rawSize = c[2] || '';
    const rawAmount = c[3] || '0';
    const rawStatus = (c[4] || '').toString().toLowerCase().trim();
    const rawNote = c[5] || '';

    const amountVal = parseFloat(String(rawAmount).replace(/[^\d.-]/g, '')) || 0;
    let status = 'Pending';
    let paidAmount = 0;

    if (rawStatus.includes('partial')) {
      status = 'Partial';
      const match = rawStatus.match(/(\d+[\d,.]*)/);
      if (match) {
        paidAmount = parseFloat(match[1].replace(/,/g, '')) || 0;
      }
      if (paidAmount === 0 && amountVal > 0) {
        paidAmount = Math.round(amountVal / 2);
      }
    } else if (rawStatus === 'received') {
      status = 'Received';
      paidAmount = amountVal;
    } else if (rawClient.toLowerCase().includes('pending') && (rawClient.includes('(') || rawClient.includes('-'))) {
      const pendingMatch = rawClient.toLowerCase().match(/(\d+)\s*(k|thousand)?\s*pending/i);
      if (pendingMatch) {
        let num = parseFloat(pendingMatch[1]) || 0;
        if (pendingMatch[2] === 'k' || pendingMatch[2] === 'thousand') num *= 1000;
        const pendingAmount = Math.min(amountVal, num);
        paidAmount = Math.max(0, amountVal - pendingAmount);
        status = paidAmount > 0 ? 'Partial' : 'Pending';
      }
    }

    const isoDate = parseDateToISO(rawDate);
    const cleanClientName = normalizeClient(rawClient.replace(/\(.*?\)/g, '').replace(/[-–].*$/g, '').trim());

    ledgerRecords.push({
      id: `led_hist_${String(i).padStart(4, '0')}`,
      organization_id: 'org_tisha_main',
      date: isoDate,
      client_name: cleanClientName || 'Direct Client',
      screen_size: rawSize.trim() || 'Standard Setup',
      total_amount: Math.round(amountVal * 100) / 100,
      paid_amount: Math.round(paidAmount * 100) / 100,
      status: status,
      payment_mode: status === 'Received' ? 'bank_transfer' : 'unpaid',
      notes: rawNote.trim(),
      linked_quotation_id: null,
      invoice_number: null
    });
  }

  console.log(`✅ Successfully transformed ${ledgerRecords.length} records.`);

  // 3. Test Supabase Table Existence
  console.log('\n📤 Step 3: Verifying Supabase payment_ledger table...');
  const { error: testError } = await supabase.from('payment_ledger').select('id').limit(1);

  if (testError) {
    if (testError.code === '42P01' || testError.message?.includes('does not exist')) {
      console.error('\n⚠️ ATTENTION: Table "payment_ledger" does not exist yet in Supabase!');
      console.log('To create the table:');
      console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/dsyicahqdiavaidsjmvl');
      console.log('2. Go to "SQL Editor" in the left sidebar.');
      console.log('3. Open or copy the SQL from "supabase_schema.sql" (Section 6: Payment Ledger Table).');
      console.log('4. Click "Run".');
      console.log('5. Re-run this migration script: npm run migrate:ledger\n');
      process.exit(1);
    } else {
      console.error('❌ Supabase connection error:', testError.message);
      process.exit(1);
    }
  }

  // 4. Batch Upsert to Supabase
  console.log(`\n🚀 Step 4: Uploading ${ledgerRecords.length} records to Supabase in batches...`);
  const BATCH_SIZE = 50;
  let uploaded = 0;

  for (let b = 0; b < ledgerRecords.length; b += BATCH_SIZE) {
    const batch = ledgerRecords.slice(b, b + BATCH_SIZE);
    const { error: upsertError } = await supabase.from('payment_ledger').upsert(batch, { onConflict: 'id' });

    if (upsertError) {
      console.error(`❌ Error uploading batch ${b / BATCH_SIZE + 1}:`, upsertError.message);
    } else {
      uploaded += batch.length;
      process.stdout.write(`   Progress: ${uploaded} / ${ledgerRecords.length} records synced...\r`);
    }
  }

  console.log(`\n🎉 MIGRATION COMPLETE! ${uploaded} records are now safely stored in Supabase!`);
  console.log('=====================================================\n');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
