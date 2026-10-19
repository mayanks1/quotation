import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, LogOut, ShieldCheck, Calendar, ChevronDown, Check, Plus } from 'lucide-react';

export default function Navbar({ 
  user, 
  onRefresh, 
  isRefreshing, 
  onLogout,
  allYears = [],
  selectedYear = 'all',
  setSelectedYear,
  onAddNew
}) {
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target)) {
        setIsYearDropdownOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="navbar-header">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="navbar-brand">
          <img
            src="https://res.cloudinary.com/dcfouzaii/image/upload/v1763444919/logo_a6xmsh.png"
            alt="Tisha LED Walls Logo"
            className="navbar-logo"
          />
          <div>
            <div className="navbar-title-wrap">
              <h1 className="navbar-title">Tisha LED Walls</h1>
              <span className="navbar-version-badge">v2.0</span>
            </div>
            <p className="navbar-subtitle">
              Financial Performance & Payment Operations
            </p>
          </div>
        </div>

        {/* Action and Status Area */}
        <div className="navbar-actions">
          {/* Top Year Filter Selector (Custom Glassmorphic Dropdown) */}
          {allYears && allYears.length > 0 && setSelectedYear && (
            <div className="navbar-year-wrap" ref={yearDropdownRef}>
              <button
                type="button"
                onClick={() => setIsYearDropdownOpen(prev => !prev)}
                className="navbar-year-trigger"
                aria-haspopup="listbox"
                aria-expanded={isYearDropdownOpen}
                title="Filter Dashboard by Financial Year"
              >
                <Calendar size={14} className="navbar-year-icon" />
                <span className="navbar-year-label">
                  {selectedYear === 'all' ? 'All Years' : selectedYear}
                </span>
                <ChevronDown 
                  size={13} 
                  className={`navbar-year-chevron ${isYearDropdownOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              {isYearDropdownOpen && (
                <div className="navbar-year-menu" role="listbox">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear('all');
                      setIsYearDropdownOpen(false);
                    }}
                    className={`navbar-year-item ${selectedYear === 'all' ? 'active' : ''}`}
                    role="option"
                    aria-selected={selectedYear === 'all'}
                  >
                    <span className="navbar-year-item-text">All Years</span>
                    {selectedYear === 'all' && <Check size={14} className="navbar-year-check" />}
                  </button>

                  {allYears.map(year => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setSelectedYear(String(year));
                        setIsYearDropdownOpen(false);
                      }}
                      className={`navbar-year-item ${String(selectedYear) === String(year) ? 'active' : ''}`}
                      role="option"
                      aria-selected={String(selectedYear) === String(year)}
                    >
                      <span className="navbar-year-item-text">{year}</span>
                      {String(selectedYear) === String(year) && <Check size={14} className="navbar-year-check" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sync badge */}
          <div className="navbar-sync-badge">
            <span className="sync-pulse-dot" />
            <span className="sync-text-desktop">Google Sheet Synced</span>
            <span className="sync-text-mobile">Synced</span>
          </div>

          {/* User tag */}
          {user?.email && (
            <div className="navbar-user-tag">
              <ShieldCheck size={14} color="#818cf8" />
              <span>{user.email.split('@')[0]}</span>
            </div>
          )}

          {/* Sync button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sync"
            title="Refresh Data from Google Sheet"
          >
            <RefreshCw size={15} className={isRefreshing ? 'spin-animation' : ''} />
            <span className="btn-text-desktop">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Add Record (Desktop) */}
          {onAddNew && (
            <button
              onClick={onAddNew}
              className="btn btn-primary btn-add-record"
              title="Create New Ledger Record"
            >
              <Plus size={15} />
              <span className="btn-text-desktop">New Entry</span>
            </button>
          )}

          {/* Return to Quotation System button */}
          <button
            onClick={onLogout}
            className="btn btn-danger btn-logout"
            title="Return to Quotation System"
          >
            <LogOut size={15} />
            <span className="btn-text-desktop">Quotes</span>
          </button>
        </div>
      </div>
    </header>
  );
}
