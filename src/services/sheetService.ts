// Re-export native Supabase Ledger Service implementation for full backward compatibility
export {
  fetchLedgerRecords,
  fetchSheetData,
  addRecord,
  updateRecord,
  deleteRecord,
  saveQuickNote,
  normalizeClient,
  parseDate,
  getYear,
  formatDate,
  parseDateToISO,
  syncInvoicedQuotation,
  handleQuotationDeleted,
  subscribeToLedgerChanges,
  getDaysRemainingInTrash,
  getTrashedRecords,
  saveTrashedRecords,
  purgeExpiredTrash,
  moveToTrash,
  restoreFromTrash,
  permanentlyDeleteRecord,
  emptyTrash,
  type LedgerRecord
} from './ledgerService';

// Fallback legacy URLs preserved for audit
export const GAS_URL = "https://script.google.com/macros/s/AKfycbzbFiup_qy6QPd2ys9Ab90x_1sPa9lfYUidLSZPbBeyT8iAcUoHoQe5XeoEl9sOkSkEOA/exec";
export const SHEET_CSV_URL = () => 
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTemOGvqyNNsVWnXXvM3IspYFzsuXUa3Fj7WIcCWR6JtpzP8zxDO2ib2EM5oW0K-_RhelagVAa0neX7/pub?gid=0&single=true&output=csv&t=" + Date.now();
