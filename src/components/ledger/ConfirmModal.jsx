import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, Calendar, IndianRupee, Tv, FileText } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  record,
  isDeleting = false,
  isPermanent = false
}) {
  useLockBodyScroll(isOpen);
  // Handle keyboard shortcuts (Escape = close, Enter = confirm)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !isDeleting) {
        // Prevent enter if focus is inside some other element
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose, onConfirm]);

  if (!isOpen || !record) return null;

  const totalAmount = parseFloat(record.amount) || 0;
  const paidAmount = parseFloat(record.paidAmount) || 0;
  const balanceDue = Math.max(0, totalAmount - paidAmount);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="modal-content confirm-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px' }}
      >
        {/* Header */}
        <div className="modal-header confirm-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="confirm-icon-badge" style={{ background: isPermanent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.15)' }}>
              <Trash2 size={20} color={isPermanent ? "#ef4444" : "#fbbf24"} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff', fontWeight: 700 }}>
                {isPermanent ? 'Permanently Delete Record' : 'Move to Trash (30 Days)'}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                {isPermanent 
                  ? 'Immediate permanent deletion from database' 
                  : 'Safely retained in Trash with restore capability'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="modal-close" 
            title="Cancel (Esc)"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body-scroll" style={{ padding: '20px 22px', gap: '16px' }}>
          {/* Record Summary Card */}
          <div className="confirm-record-preview">
            <div className="confirm-client-row">
              <span className="confirm-client-name">{record.client || 'Untitled Client'}</span>
              <span className={`status-badge status-${(record.status || 'pending').toLowerCase()}`}>
                {record.status || 'Pending'}
              </span>
            </div>

            <div className="confirm-meta-grid">
              <div className="confirm-meta-item">
                <Calendar size={13} color="var(--text-muted)" />
                <span>{record.date || '—'}</span>
              </div>
              {record.size && (
                <div className="confirm-meta-item">
                  <Tv size={13} color="var(--text-muted)" />
                  <span>{record.size}</span>
                </div>
              )}
              <div className="confirm-meta-item" style={{ gridColumn: 'span 2' }}>
                <IndianRupee size={13} color="var(--text-muted)" />
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </span>
                {record.status === 'Partial' && (
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: '4px' }}>
                    (Paid: ₹{paidAmount.toLocaleString('en-IN')} • Due: ₹{balanceDue.toLocaleString('en-IN')})
                  </span>
                )}
              </div>
            </div>

            {record.note && (
              <div className="confirm-note-box">
                <FileText size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{record.note}</span>
              </div>
            )}
          </div>

          {/* Warning Message */}
          <div 
            className="confirm-warning-bar"
            style={{
              borderColor: isPermanent ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.35)',
              background: isPermanent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.08)'
            }}
          >
            <AlertTriangle size={16} color={isPermanent ? "#f87171" : "#fbbf24"} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '12.5px', lineHeight: 1.45, color: isPermanent ? '#fca5a5' : '#fde68a' }}>
              {isPermanent ? (
                <>This record will be <strong>permanently deleted</strong>. This action cannot be undone.</>
              ) : (
                <>Record will be moved to <strong>Trash for 30 days</strong>. You can restore it anytime during this retention period.</>
              )}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-actions-footer" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={`btn ${isPermanent ? 'btn-danger' : 'btn-warning'}`}
            style={{ 
              flex: 1.3,
              background: isPermanent ? undefined : 'linear-gradient(135deg, #d97706, #b45309)',
              color: '#ffffff',
              borderColor: isPermanent ? undefined : 'rgba(245, 158, 11, 0.5)'
            }}
          >
            <Trash2 size={15} />
            <span>
              {isDeleting
                ? (isPermanent ? 'Deleting...' : 'Moving to Trash...')
                : (isPermanent ? 'Delete Permanently' : 'Move to Trash')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
