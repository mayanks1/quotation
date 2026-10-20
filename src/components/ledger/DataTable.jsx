import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Edit3, 
  Trash2, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Maximize2,
  LayoutGrid,
  Table as TableIcon,
  X,
  User,
  ChevronDown,
  StickyNote,
  Check,
  MessageCircle,
  Printer,
  Receipt
} from 'lucide-react';
import { formatDate, parseDate } from '../../services/sheetService';

export default function DataTable({
  records,
  allClients,
  allYears,
  selectedYear,
  setSelectedYear,
  selectedClient,
  setSelectedClient,
  onEditRecord,
  onDeleteRecord,
  onResetFilters,
  onOpenNoteModal,
  onGenerateReceipt
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Received' | 'Pending'
  const [sortField, setSortField] = useState('date');
  const [sortAsc, setSortAsc] = useState(false); // default: FALSE for Latest data on top!
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileViewPreference, setMobileViewPreference] = useState('cards'); // 'cards' | 'table'
  
  // Client Combobox search state
  const [clientQuery, setClientQuery] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientComboboxRef = useRef(null);

  // Custom Year Dropdown state
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef(null);

  const rowsPerPage = 50;

  // Close dropdowns when clicking outside or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (clientComboboxRef.current && !clientComboboxRef.current.contains(event.target)) {
        setIsClientDropdownOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setIsYearDropdownOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsClientDropdownOpen(false);
        setIsYearDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filtered client suggestions for the search box
  const matchingClients = allClients.filter(c => 
    c.toLowerCase().includes(clientQuery.toLowerCase())
  );

  // 1. Filter records
  const filteredRecords = records.filter(record => {
    // Status filter
    if (statusFilter !== 'ALL' && record.status !== statusFilter) {
      return false;
    }
    // Search query
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchClient = record.client.toLowerCase().includes(q);
      const matchDate = record.date.toLowerCase().includes(q);
      const matchSize = record.size.toLowerCase().includes(q);
      const matchAmount = String(record.amount).includes(q);
      if (!matchClient && !matchDate && !matchSize && !matchAmount) {
        return false;
      }
    }
    return true;
  });

  // 2. Sort records (LATEST on top by default)
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let comp = 0;
    if (sortField === 'amount') {
      comp = a.amount - b.amount;
    } else if (sortField === 'client') {
      comp = a.client.localeCompare(b.client);
    } else if (sortField === 'size') {
      comp = a.size.localeCompare(b.size);
    } else if (sortField === 'status') {
      comp = a.status.localeCompare(b.status);
    } else {
      // Date sorting: accurately parse multi-day ranges like 17-19/01/2026
      const timeA = parseDate(a.date).getTime();
      const timeB = parseDate(b.date).getTime();
      comp = timeA - timeB;
      // Secondary sort if dates match: preserve sheet order
      if (comp === 0) {
        comp = (a.sheetRow || 0) - (b.sheetRow || 0);
      }
    }
    // If sortAsc is false, comp is inverted so latest date appears at the top!
    return sortAsc ? comp : -comp;
  });

  // 3. Pagination
  const totalPages = Math.ceil(sortedRecords.length / rowsPerPage) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * rowsPerPage;
  const pagedRecords = sortedRecords.slice(startIndex, startIndex + rowsPerPage);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // For date, default to latest first (sortAsc = false)
      setSortAsc(field === 'date' ? false : true);
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={13} style={{ opacity: 0.4 }} />;
    return sortAsc ? <ArrowUp size={13} color="#818cf8" /> : <ArrowDown size={13} color="#818cf8" />;
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['S.No', 'Date', 'Client', 'Size', 'Total Amount', 'Status', 'Paid Amount', 'Pending Due', 'Note'];
    const rows = sortedRecords.map((r, i) => [
      i + 1,
      `"${r.date}"`,
      `"${r.client}"`,
      `"${r.size}"`,
      r.amount,
      r.status,
      r.status === 'Received' ? r.amount : (r.status === 'Partial' ? (r.paidAmount || 0) : 0),
      r.status === 'Pending' ? r.amount : (r.status === 'Partial' ? (r.pendingAmount || 0) : 0),
      `"${(r.note || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tisha_LED_Records_${selectedYear || 'All'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectClient = (clientName) => {
    setSelectedClient(clientName);
    setClientQuery('');
    setIsClientDropdownOpen(false);
    setCurrentPage(1);
  };

  const handleWhatsAppFollowup = (record) => {
    const isPartial = record.status === 'Partial';
    const pendingAmt = isPartial ? (record.pendingAmount || Math.round(record.amount / 2)) : record.amount;
    const paidAmt = isPartial ? (record.paidAmount || (record.amount - pendingAmt)) : 0;
    
    const lines = [
      `*PAYMENT REMINDER - TISHA LED WALLS*`,
      `Hello *${record.client}*,`,
      ``,
      `Gentle reminder regarding payment for your event setup:`,
      `📅 *Event Date:* ${formatDate(record.date)}`,
      `🖥️ *Setup:* ${record.size || 'LED Wall Display'}`,
      `💰 *Total Amount:* ₹${Number(record.amount || 0).toLocaleString('en-IN')}`,
    ];

    if (paidAmt > 0) {
      lines.push(`✅ *Received:* ₹${Number(paidAmt).toLocaleString('en-IN')}`);
    }
    lines.push(`⏳ *Balance Due:* ₹${Number(pendingAmt).toLocaleString('en-IN')}`);
    lines.push(``);
    lines.push(`Kindly clear the balance at your earliest convenience.`);
    lines.push(`Thank you for choosing *Tisha LED Walls*!`);

    const text = lines.join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Client stats for Account Statement
  const clientStats = useMemo(() => {
    if (!selectedClient || selectedClient === 'all') return null;
    const clientRecords = records.filter(r => r.client.toLowerCase() === selectedClient.toLowerCase());
    const totalEvents = clientRecords.length;
    let totalBilled = 0;
    let totalReceived = 0;
    let totalPending = 0;

    clientRecords.forEach(r => {
      totalBilled += (r.amount || 0);
      if (r.status === 'Received') {
        totalReceived += (r.amount || 0);
      } else if (r.status === 'Partial') {
        const paid = r.paidAmount || Math.round(r.amount / 2);
        totalReceived += paid;
        totalPending += Math.max(0, r.amount - paid);
      } else {
        totalPending += (r.amount || 0);
      }
    });

    return {
      totalEvents,
      totalBilled,
      totalReceived,
      totalPending,
      records: clientRecords
    };
  }, [records, selectedClient]);

  const handlePrintClientStatement = () => {
    if (!clientStats || !selectedClient || selectedClient === 'all') return;
    const clientRecords = clientStats.records;
    const win = window.open('', '_blank');
    if (!win) return;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Account Statement - ${selectedClient}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 36px; color: #0f172a; background: #fff; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 24px; }
          .brand { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
          .brand span { color: #4f46e5; }
          .tagline { font-size: 13px; color: #64748b; margin-top: 4px; }
          .title-block { text-align: right; }
          .doc-title { font-size: 18px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; }
          .client-name { font-size: 14px; font-weight: 700; color: #4f46e5; margin-top: 4px; }
          .gen-date { font-size: 12px; color: #64748b; margin-top: 2px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
          .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
          .stat-label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
          .stat-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .due { color: #d97706; }
          .rec { color: #16a34a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .badge { padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; display: inline-block; }
          .badge-rec { background: #dcfce7; color: #15803d; }
          .badge-part { background: #fef3c7; color: #b45309; }
          .badge-pend { background: #fee2e2; color: #b91c1c; }
          .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
          @media print {
            body { padding: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">TISHA <span>LED WALLS</span></div>
            <div class="tagline">Premium Indoor & Outdoor LED Display Screen Rentals</div>
          </div>
          <div class="title-block">
            <div class="doc-title">Statement of Accounts</div>
            <div class="client-name">${selectedClient}</div>
            <div class="gen-date">Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Events</div>
            <div class="stat-value">${clientStats.totalEvents}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Billed</div>
            <div class="stat-value">₹${clientStats.totalBilled.toLocaleString('en-IN')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Received</div>
            <div class="stat-value rec">₹${clientStats.totalReceived.toLocaleString('en-IN')}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Net Balance Due</div>
            <div class="stat-value due">₹${clientStats.totalPending.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Event Date</th>
              <th>Screen Setup</th>
              <th class="text-right">Total Amount</th>
              <th class="text-right">Paid</th>
              <th class="text-right">Due Balance</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${clientRecords.map((r, i) => {
              const paid = r.status === 'Received' ? r.amount : (r.status === 'Partial' ? (r.paidAmount || Math.round(r.amount/2)) : 0);
              const due = r.status === 'Pending' ? r.amount : (r.status === 'Partial' ? (r.pendingAmount || Math.round(r.amount/2)) : 0);
              const badgeClass = r.status === 'Received' ? 'badge-rec' : (r.status === 'Partial' ? 'badge-part' : 'badge-pend');
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${formatDate(r.date)}</strong></td>
                  <td>${r.size || '—'}</td>
                  <td class="text-right">₹${Number(r.amount).toLocaleString('en-IN')}</td>
                  <td class="text-right" style="color: #16a34a;">₹${Number(paid).toLocaleString('en-IN')}</td>
                  <td class="text-right" style="color: #d97706; font-weight: 700;">₹${Number(due).toLocaleString('en-IN')}</td>
                  <td><span class="badge ${badgeClass}">${r.status}</span></td>
                  <td style="color: #64748b; font-size: 12px;">${r.note || '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          This is a computer-generated account statement for records and payment reconciliation. Contact Tisha LED Walls for any questions.
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  const handleWhatsAppClientStatement = () => {
    if (!clientStats || !selectedClient || selectedClient === 'all') return;
    const text = `*STATEMENT OF ACCOUNTS - TISHA LED WALLS*
Client: *${selectedClient}*
Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}

📊 *Summary:*
• Total Events: ${clientStats.totalEvents}
• Total Billed: ₹${clientStats.totalBilled.toLocaleString('en-IN')}
• Total Received: ₹${clientStats.totalReceived.toLocaleString('en-IN')}
• *Net Outstanding Balance: ₹${clientStats.totalPending.toLocaleString('en-IN')}*

Kindly review and let us know if you need invoices or breakdown for any specific event.
Thank you for your continuous business!
— *Tisha LED Walls*`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="glass-panel table-panel">
      {/* Top Filter & Action Toolbar */}
      <div className="table-toolbar">
        {/* Search Box (Left) */}
        <div className="table-search-group">
          <Search size={16} className="table-search-icon" />
          <input 
            type="text"
            placeholder="Search date, organization, amount..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="form-input table-search-input"
          />
        </div>

        {/* Filters Group (Right): Year Dropdown + Client Combobox + Reset */}
        <div className="table-dropdowns-row">
          {/* Custom Year Dropdown */}
          <div className="table-year-dropdown-wrap" ref={yearDropdownRef}>
            <button
              type="button"
              onClick={() => setIsYearDropdownOpen(prev => !prev)}
              className="table-year-trigger"
              aria-haspopup="listbox"
              aria-expanded={isYearDropdownOpen}
              title="Filter by Financial Year"
            >
              <span className="table-year-label">
                {selectedYear === 'all' ? 'All Years' : selectedYear}
              </span>
              <ChevronDown 
                size={14} 
                className={`table-year-chevron ${isYearDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </button>

            {isYearDropdownOpen && (
              <div className="table-year-menu" role="listbox">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedYear('all');
                    setCurrentPage(1);
                    setIsYearDropdownOpen(false);
                  }}
                  className={`table-year-item ${selectedYear === 'all' ? 'active' : ''}`}
                  role="option"
                  aria-selected={selectedYear === 'all'}
                >
                  <span>All Years</span>
                  {selectedYear === 'all' && <Check size={14} className="table-year-check" />}
                </button>

                {allYears.map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setSelectedYear(String(year));
                      setCurrentPage(1);
                      setIsYearDropdownOpen(false);
                    }}
                    className={`table-year-item ${String(selectedYear) === String(year) ? 'active' : ''}`}
                    role="option"
                    aria-selected={String(selectedYear) === String(year)}
                  >
                    <span>{year}</span>
                    {String(selectedYear) === String(year) && <Check size={14} className="table-year-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type-and-Search Client Combobox */}
          <div className="client-combobox-wrap" ref={clientComboboxRef}>
            <div className="client-combobox-input-wrap">
              <User size={15} className="client-combobox-icon" />
              <input
                type="text"
                placeholder={selectedClient === 'all' ? `Filter Client (${allClients.length})...` : selectedClient}
                value={isClientDropdownOpen ? clientQuery : (selectedClient === 'all' ? '' : selectedClient)}
                onFocus={() => {
                  setIsClientDropdownOpen(true);
                  setClientQuery('');
                }}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setIsClientDropdownOpen(true);
                }}
                className={`form-input client-combobox-input ${selectedClient !== 'all' ? 'has-selection' : ''}`}
              />

              {/* Clear button if client is selected */}
              {selectedClient !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient('all');
                    setClientQuery('');
                    setIsClientDropdownOpen(false);
                    setCurrentPage(1);
                  }}
                  className="client-combobox-clear-btn"
                  title="Clear client filter"
                >
                  <X size={14} />
                </button>
              ) : (
                <ChevronDown 
                  size={14} 
                  className="client-combobox-arrow" 
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                />
              )}
            </div>

            {/* Dropdown Suggestions Menu */}
            {isClientDropdownOpen && (
              <div className="client-suggestions-dropdown">
                {/* Reset to All Clients */}
                <div 
                  className={`client-suggestion-item ${selectedClient === 'all' ? 'active' : ''}`}
                  onClick={() => handleSelectClient('all')}
                >
                  <strong>All Clients</strong>
                  <span className="client-count-tag">{allClients.length} total</span>
                </div>

                {matchingClients.length > 0 ? (
                  matchingClients.map(client => (
                    <div
                      key={client}
                      className={`client-suggestion-item ${selectedClient === client ? 'active' : ''}`}
                      onClick={() => handleSelectClient(client)}
                    >
                      <span>{client}</span>
                    </div>
                  ))
                ) : (
                  <div className="client-suggestion-empty">
                    No client matching "{clientQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reset Filters */}
          <button 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setClientQuery('');
              onResetFilters();
            }}
            className="btn btn-secondary btn-reset-filter" 
            title="Reset All Filters"
          >
            <RotateCcw size={15} />
            <span className="btn-text-desktop">Reset</span>
          </button>
        </div>
      </div>

      {/* Client Account Summary & Statement Banner */}
      {clientStats && (
        <div style={{
          margin: '0 0 16px 0',
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#818cf8', fontWeight: '700' }}>
                Client Account Summary
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
                {selectedClient}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Events: </span>
                <strong style={{ color: '#f8fafc' }}>{clientStats.totalEvents}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Billed: </span>
                <strong style={{ color: '#f8fafc' }}>₹{clientStats.totalBilled.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Received: </span>
                <strong style={{ color: '#4ade80' }}>₹{clientStats.totalReceived.toLocaleString('en-IN')}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Due: </span>
                <strong style={{ color: '#fbbf24' }}>₹{clientStats.totalPending.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrintClientStatement}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Print or Save Statement PDF"
            >
              <Printer size={13} color="#818cf8" />
              <span>Statement PDF</span>
            </button>
            <button
              onClick={handleWhatsAppClientStatement}
              className="btn"
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(37, 211, 102, 0.15)',
                border: '1px solid rgba(37, 211, 102, 0.35)',
                color: '#4ade80'
              }}
              title="Send Statement Summary on WhatsApp"
            >
              <MessageCircle size={13} />
              <span>WhatsApp Summary</span>
            </button>
          </div>
        </div>
      )}

      {/* Secondary Row: Status Tabs & Mobile View Toggle & Export */}
        <div className="table-tabs-and-export">
          {/* Status Tabs */}
          <div className="status-tabs-container">
            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`status-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
            >
              All ({records.length})
            </button>
            <button
              onClick={() => { setStatusFilter('Received'); setCurrentPage(1); }}
              className={`status-tab status-tab-received ${statusFilter === 'Received' ? 'active' : ''}`}
            >
              Received ({records.filter(r => r.status === 'Received').length})
            </button>
            <button
              onClick={() => { setStatusFilter('Partial'); setCurrentPage(1); }}
              className={`status-tab status-tab-partial ${statusFilter === 'Partial' ? 'active' : ''}`}
            >
              Partial ({records.filter(r => r.status === 'Partial').length})
            </button>
            <button
              onClick={() => { setStatusFilter('Pending'); setCurrentPage(1); }}
              className={`status-tab status-tab-pending ${statusFilter === 'Pending' ? 'active' : ''}`}
            >
              Pending ({records.filter(r => r.status === 'Pending').length})
            </button>
          </div>

          {/* Right Group: Mobile View Toggle + Export */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* View Switcher on Mobile (Cards vs Table) */}
            <div className="mobile-view-toggle">
              <button
                type="button"
                onClick={() => setMobileViewPreference('cards')}
                className={`btn-view-toggle ${mobileViewPreference === 'cards' ? 'active' : ''}`}
                title="Card View (Mobile Optimized)"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setMobileViewPreference('table')}
                className={`btn-view-toggle ${mobileViewPreference === 'table' ? 'active' : ''}`}
                title="Table View (Full Grid)"
              >
                <TableIcon size={14} />
              </button>
            </div>

            {/* Export CSV button */}
            <button 
              onClick={handleExportCSV}
              className="btn btn-secondary btn-export-csv"
              title="Export filtered records as CSV"
            >
              <Download size={14} />
              <span className="btn-text-desktop">Export</span>
              <span>CSV</span>
            </button>
          </div>
        </div>

      {/* ========================================================
          1. MOBILE CARD VIEW (Active on mobile screens or toggle)
          ======================================================== */}
      <div className={`mobile-cards-feed ${mobileViewPreference === 'table' ? 'force-hide-cards' : ''}`}>
        {pagedRecords.length > 0 ? (
          pagedRecords.map((record, index) => (
            <div key={`m-${record.id || index}`} className="mobile-record-card">
              {/* Header: Date + Index + Status */}
              <div className="mobile-card-header">
                <div className="mobile-card-date-wrap">
                  <span className="mobile-card-index">#{startIndex + index + 1}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={13} color="#818cf8" />
                    <span className="mobile-card-date">{formatDate(record.date)}</span>
                  </div>
                </div>

                <span className={`status-badge ${record.status === 'Received' ? 'received' : (record.status === 'Partial' ? 'partial' : 'pending')}`}>
                  {record.status === 'Received' ? (
                    <>
                      <CheckCircle2 size={11} />
                      <span>Received</span>
                    </>
                  ) : record.status === 'Partial' ? (
                    <>
                      <span style={{ fontSize: '11px' }}>🌗</span>
                      <span>Partial</span>
                    </>
                  ) : (
                    <>
                      <Clock size={11} />
                      <span>Pending</span>
                    </>
                  )}
                </span>
              </div>

              {/* Body: Client Name + Size + Note */}
              <div className="mobile-card-body">
                <h4 className="mobile-card-client">{record.client}</h4>
                {record.size && (
                  <div className="mobile-card-size">
                    <Maximize2 size={12} color="#94a3b8" />
                    <span>Screen: {record.size}</span>
                  </div>
                )}
                {record.note && (
                  <div 
                    className="mobile-card-note-pill" 
                    onClick={() => onOpenNoteModal && onOpenNoteModal(record)}
                    title="Tap to edit note"
                  >
                    <StickyNote size={12} color="#fbbf24" style={{ flexShrink: 0 }} />
                    <span>{record.note}</span>
                  </div>
                )}
              </div>

              {/* Footer: Amount + Actions */}
              <div className="mobile-card-footer">
                <div>
                  <div className="mobile-amount-label">
                    {record.status === 'Partial' ? 'Total (Partial Paid)' : 'Event Amount'}
                  </div>
                  <div className="mobile-amount-val">
                    ₹ {record.amount.toLocaleString('en-IN')}
                  </div>
                  {record.status === 'Partial' && (
                    <div style={{ fontSize: '11px', marginTop: '3px', fontWeight: '500', display: 'flex', gap: '6px' }}>
                      <span style={{ color: '#4ade80' }}>Paid: ₹{(record.paidAmount || 0).toLocaleString('en-IN')}</span>
                      <span style={{ color: '#fbbf24' }}>Due: ₹{(record.pendingAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                <div className="mobile-card-actions">
                  <button
                    onClick={() => onGenerateReceipt && onGenerateReceipt(record)}
                    className="btn btn-icon-sm"
                    style={
                      record.status === 'Pending'
                        ? {
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: '#fbbf24'
                          }
                        : {
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            color: '#34d399'
                          }
                    }
                    title={record.status === 'Pending' ? "Generate Pending Payment Bill / Receipt" : "Generate Official Money Receipt"}
                  >
                    <Receipt size={14} />
                  </button>
                  {record.status !== 'Received' && (
                    <button 
                      onClick={() => handleWhatsAppFollowup(record)}
                      className="btn btn-icon-sm"
                      style={{
                        background: 'rgba(37, 211, 102, 0.15)',
                        border: '1px solid rgba(37, 211, 102, 0.35)',
                        color: '#4ade80'
                      }}
                      title="Send WhatsApp Payment Follow-up"
                    >
                      <MessageCircle size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => onOpenNoteModal && onOpenNoteModal(record)}
                    className={`btn btn-icon-sm ${record.note ? 'btn-note-active' : 'btn-secondary'}`}
                    title={record.note ? `Note: ${record.note}` : "Add Note"}
                  >
                    <StickyNote size={14} color={record.note ? "#fbbf24" : "#94a3b8"} />
                  </button>
                  <button 
                    onClick={() => onEditRecord(record)}
                    className="btn btn-secondary btn-icon-sm"
                    title="Edit entry"
                  >
                    <Edit3 size={14} color="#818cf8" />
                  </button>
                  <button 
                    onClick={() => onDeleteRecord(record)}
                    className="btn btn-danger btn-icon-sm"
                    title="Delete entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state-card">
            <Filter size={28} style={{ opacity: 0.3 }} />
            <p>No records found matching your filters</p>
            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); onResetFilters(); }} 
              className="btn btn-secondary"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* ========================================================
          2. DESKTOP / TABLE VIEW (Active on desktop or toggle)
          ======================================================== */}
      <div className={`table-responsive desktop-table-view ${mobileViewPreference === 'table' ? 'force-show-table' : ''}`}>
        <table className="modern-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th className="sortable" onClick={() => handleSort('date')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Event Date</span>
                  {getSortIcon('date')}
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort('client')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Client / Organization</span>
                  {getSortIcon('client')}
                </div>
              </th>
              <th className="sortable hide-mobile" onClick={() => handleSort('size')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Size</span>
                  {getSortIcon('size')}
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort('amount')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Amount</span>
                  {getSortIcon('amount')}
                </div>
              </th>
              <th className="sortable" onClick={() => handleSort('status')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Status</span>
                  {getSortIcon('status')}
                </div>
              </th>
              <th style={{ textAlign: 'right', width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRecords.length > 0 ? (
              pagedRecords.map((record, index) => (
                <tr key={record.id || index}>
                  <td style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                    {startIndex + index + 1}
                  </td>
                  <td style={{ fontWeight: '500', fontSize: '13px' }}>
                    {formatDate(record.date)}
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '13px' }}>
                      {record.client}
                    </div>
                    {record.note && (
                      <div 
                        className="table-note-pill"
                        onClick={() => onOpenNoteModal && onOpenNoteModal(record)}
                        title="Click to view/edit note"
                      >
                        <StickyNote size={11} color="#fbbf24" style={{ flexShrink: 0 }} />
                        <span className="table-note-text">{record.note}</span>
                      </div>
                    )}
                  </td>
                  <td className="hide-mobile" style={{ color: 'var(--text-muted)' }}>
                    {record.size || '—'}
                  </td>
                  <td>
                    <span className="amount-text">
                      ₹ {record.amount.toLocaleString('en-IN')}
                    </span>
                    {record.status === 'Partial' && (
                      <div style={{ fontSize: '11px', marginTop: '2px', fontWeight: '500', display: 'flex', gap: '6px' }}>
                        <span style={{ color: '#4ade80' }}>Paid: ₹{(record.paidAmount || 0).toLocaleString('en-IN')}</span>
                        <span style={{ color: '#fbbf24' }}>Due: ₹{(record.pendingAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${record.status === 'Received' ? 'received' : (record.status === 'Partial' ? 'partial' : 'pending')}`}>
                      {record.status === 'Received' ? (
                        <>
                          <CheckCircle2 size={11} />
                          <span>Received</span>
                        </>
                      ) : record.status === 'Partial' ? (
                        <>
                          <span style={{ fontSize: '11px' }}>🌗</span>
                          <span>Partial</span>
                        </>
                      ) : (
                        <>
                          <Clock size={11} />
                          <span>Pending</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                      <button
                        onClick={() => onGenerateReceipt && onGenerateReceipt(record)}
                        className="btn btn-icon-sm"
                        style={
                          record.status === 'Pending'
                            ? {
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                color: '#fbbf24'
                              }
                            : {
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#34d399'
                              }
                        }
                        title={record.status === 'Pending' ? "Generate Pending Payment Bill / Receipt" : "Generate Official Money Receipt"}
                      >
                        <Receipt size={13} />
                      </button>
                      {record.status !== 'Received' && (
                        <button 
                          onClick={() => handleWhatsAppFollowup(record)}
                          className="btn btn-icon-sm"
                          style={{
                            background: 'rgba(37, 211, 102, 0.15)',
                            border: '1px solid rgba(37, 211, 102, 0.35)',
                            color: '#4ade80'
                          }}
                          title="Send WhatsApp Payment Follow-up"
                        >
                          <MessageCircle size={13} />
                        </button>
                      )}
                      <button 
                        onClick={() => onOpenNoteModal && onOpenNoteModal(record)}
                        className={`btn btn-icon-sm ${record.note ? 'btn-note-active' : 'btn-secondary'}`}
                        title={record.note ? `Note: ${record.note}` : "Add Note"}
                      >
                        <StickyNote size={13} color={record.note ? "#fbbf24" : "#94a3b8"} />
                      </button>
                      <button 
                        onClick={() => onEditRecord(record)}
                        className="btn btn-secondary btn-icon-sm"
                        title="Edit entry"
                      >
                        <Edit3 size={13} color="#818cf8" />
                      </button>
                      <button 
                        onClick={() => onDeleteRecord(record)}
                        className="btn btn-danger btn-icon-sm"
                        title="Delete entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Filter size={28} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: '14px' }}>No records found matching your filters</p>
                    <button 
                      onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); onResetFilters(); }} 
                      className="btn btn-secondary"
                      style={{ fontSize: '12px' }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================
          3. PAGINATION FOOTER (PERFECTLY CENTERED)
          ======================================================== */}
      <div className="table-pagination-footer">
        <div className="pagination-center-group">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={validPage <= 1}
            className="btn btn-secondary pagination-btn"
            title="Previous Page"
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>

          <span className="pagination-page-label">
            Page <strong>{validPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={validPage >= totalPages}
            className="btn btn-secondary pagination-btn"
            title="Next Page"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="pagination-records-info">
          Showing <strong>{sortedRecords.length > 0 ? startIndex + 1 : 0}</strong>–<strong>{Math.min(startIndex + rowsPerPage, sortedRecords.length)}</strong> of <strong>{sortedRecords.length}</strong> records
        </div>
      </div>
    </div>
  );
}
