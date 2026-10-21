import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, Calendar, IndianRupee, Tv, FileText } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  record,
  isDeleting = false
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
            <div className="confirm-icon-badge">
              <Trash2 size={20} color="#f87171" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>Delete Event Record</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                This record will be removed from your dashboard
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
          <div className="confirm-warning-bar">
            <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
            <span>
              Are you sure you want to permanently delete this entry? A 9-second undo option will be available.
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
            className="btn btn-danger"
            style={{ flex: 1.2 }}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Deleting...' : 'Delete Record'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
