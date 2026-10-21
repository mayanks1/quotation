import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, StickyNote, Calendar, User, IndianRupee, Sparkles } from 'lucide-react';
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll';

const QUICK_SUGGESTIONS = [
  'Advance Paid via UPI',
  'Balance on Setup Day',
  'Full Payment Cleared',
  'GST Invoice Required',
  'Extra Cables / TV Provided',
  'Technician Assigned'
];

export default function NoteModal({
  isOpen,
  onClose,
  record,
  onSaveNote,
  isSaving
}) {
  useLockBodyScroll(isOpen);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if (record) {
      setNoteText(record.note || '');
    } else {
      setNoteText('');
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const handleSuggestionClick = (chip) => {
    if (!noteText.trim()) {
      setNoteText(chip);
    } else if (!noteText.includes(chip)) {
      setNoteText(`${noteText.trim()}, ${chip}`);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveNote(record, noteText.trim());
  };

  const handleClear = () => {
    setNoteText('');
    onSaveNote(record, '');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content note-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="note-modal-icon-badge">
              <StickyNote size={18} color="#fbbf24" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Event Note</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Add private remarks & payment details
              </p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close" title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Note Form */}
        <form onSubmit={handleSave} className="modal-form-wrap">
          <div className="modal-body-scroll">
            {/* Event Summary Card */}
            <div className="note-modal-summary">
              <div className="note-summary-item">
                <User size={13} color="#818cf8" />
                <strong style={{ color: '#f8fafc' }}>{record.client}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} />
                  {record.date}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontWeight: '600' }}>
                  <IndianRupee size={12} />
                  ₹ {record.amount?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Note Details</span>
                {noteText && (
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                    {noteText.length} characters
                  </span>
                )}
              </label>
              <textarea
                autoFocus
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="form-input note-textarea"
                placeholder="e.g. ₹5,000 Advance paid via PhonePe, balance due on setup date. Manager contact: 9876543210"
              />
            </div>

            {/* Quick Suggestion Chips */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <Sparkles size={12} color="#818cf8" />
                <span>Quick tags (tap to add):</span>
              </div>
              <div className="note-chips-wrap">
                {QUICK_SUGGESTIONS.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSuggestionClick(chip)}
                    className="note-chip-btn"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="modal-actions-footer">
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              style={{ flex: 2 }}
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save Note'}</span>
            </button>

            {record.note && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleClear}
                className="btn btn-danger"
                style={{ flex: 1 }}
                title="Remove note from this event"
              >
                <Trash2 size={15} />
                <span>Clear</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
