import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, User, Maximize2, IndianRupee, PieChart, FileText, AlertCircle } from 'lucide-react';

export default function RecordModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isSaving
}) {
  const [formData, setFormData] = useState({
    date: '',
    client: '',
    size: '',
    amount: '',
    status: 'Pending',
    paidAmount: '',
    note: ''
  });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    setValidationError('');
    if (initialData) {
      setFormData({
        date: initialData.date || '',
        client: initialData.client || '',
        size: initialData.size || '',
        amount: initialData.amount || '',
        status: initialData.status || 'Pending',
        paidAmount: initialData.paidAmount || (initialData.status === 'Received' ? initialData.amount : ''),
        note: initialData.note || ''
      });
    } else {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      setFormData({
        date: `${dd}/${mm}/${yyyy}`,
        client: '',
        size: '',
        amount: '',
        status: 'Pending',
        paidAmount: '',
        note: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const totalAmt = parseFloat(formData.amount) || 0;
  const currentPaid = parseFloat(formData.paidAmount) || 0;
  const balanceDue = Math.max(0, totalAmt - currentPaid);
  const paidPercent = totalAmt > 0 ? Math.min(100, Math.round((currentPaid / totalAmt) * 100)) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.client.trim()) {
      setValidationError('Please enter a client or organization name.');
      return;
    }

    if (formData.status === 'Partial') {
      if (currentPaid <= 0) {
        setValidationError('Please enter a valid partial advance amount greater than ₹0.');
        return;
      }
      if (currentPaid >= totalAmt) {
        // If paid in full, automatically set status to Received
        onSave({
          ...formData,
          amount: totalAmt,
          paidAmount: totalAmt,
          status: 'Received',
          note: formData.note?.trim() || ''
        });
        return;
      }
    }

    onSave({
      ...formData,
      amount: totalAmt,
      paidAmount: formData.status === 'Received' ? totalAmt : (formData.status === 'Partial' ? currentPaid : 0),
      note: formData.note?.trim() || ''
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>{initialData ? 'Edit Event Record' : 'Add New Event Entry'}</h3>
          <button onClick={onClose} className="modal-close" title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form-wrap">
          <div className="modal-body-scroll">
            {validationError && (
              <div className="modal-validation-error">
                <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0 }} />
                <span>{validationError}</span>
              </div>
            )}

            {/* Date */}
          <div className="form-group">
            <label>Event Date (DD/MM/YYYY or DD-DD/MM/YYYY)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value.replace(/,/g, '') })}
                className="form-input"
                placeholder="e.g. 15/10/2026"
              />
            </div>
          </div>

          {/* Client Name */}
          <div className="form-group">
            <label>Client / Organization Name</label>
            <input
              type="text"
              required
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value.replace(/,/g, '') })}
              className="form-input"
              placeholder="e.g. Grand Palace Convention"
            />
          </div>

          {/* Screen Size & Total Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label>LED Screen Size</label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value.replace(/,/g, '') })}
                className="form-input"
                placeholder="e.g. 12x8 ft"
              />
            </div>

            <div className="form-group">
              <label>Total Event Amount (₹)</label>
              <input
                type="number"
                inputMode="numeric"
                required
                min="0"
                step="any"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="form-input"
                placeholder="e.g. 35000"
              />
            </div>
          </div>

          {/* Status Selection (Received / Partial / Pending) */}
          <div className="form-group">
            <label>Payment Status</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {/* 1. Received */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'Received', paidAmount: formData.amount })}
                style={{
                  padding: '10px 6px',
                  borderRadius: 'var(--radius-md)',
                  border: formData.status === 'Received' ? '2px solid #22c55e' : '1px solid var(--border-subtle)',
                  background: formData.status === 'Received' ? 'rgba(34, 197, 94, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                  color: formData.status === 'Received' ? '#4ade80' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ✓ Received
              </button>

              {/* 2. Partial Payment (NEW) */}
              <button
                type="button"
                onClick={() => {
                  setFormData({ 
                    ...formData, 
                    status: 'Partial',
                    paidAmount: formData.paidAmount || (totalAmt > 0 ? String(Math.round(totalAmt / 2)) : '')
                  });
                }}
                style={{
                  padding: '10px 6px',
                  borderRadius: 'var(--radius-md)',
                  border: formData.status === 'Partial' ? '2px solid #818cf8' : '1px solid var(--border-subtle)',
                  background: formData.status === 'Partial' ? 'rgba(99, 102, 241, 0.22)' : 'rgba(15, 23, 42, 0.6)',
                  color: formData.status === 'Partial' ? '#a5b4fc' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🌗 Partial
              </button>

              {/* 3. Pending */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'Pending', paidAmount: '0' })}
                style={{
                  padding: '10px 6px',
                  borderRadius: 'var(--radius-md)',
                  border: formData.status === 'Pending' ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
                  background: formData.status === 'Pending' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                  color: formData.status === 'Pending' ? '#fbbf24' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ⏳ Pending
              </button>
            </div>

            {/* PARTIAL PAYMENT INPUT & LIVE BALANCE BREAKDOWN */}
            {formData.status === 'Partial' && (
              <div style={{
                marginTop: '14px',
                padding: '14px',
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.8))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#a5b4fc', margin: 0 }}>
                    Advance / Paid Amount Received (₹)
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#818cf8' }}>
                    {paidPercent}% Paid
                  </span>
                </div>

                <input
                  type="number"
                  inputMode="numeric"
                  required
                  min="1"
                  max={totalAmt > 0 ? totalAmt : undefined}
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                  className="form-input"
                  placeholder="e.g. 10000"
                  style={{
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                    background: 'rgba(15, 23, 42, 0.9)'
                  }}
                />

                {/* Balance Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  borderRadius: '999px',
                  marginTop: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${paidPercent}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #22c55e)',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                {/* Breakdown Summary */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  <span style={{ color: '#4ade80' }}>
                    ✓ Paid: ₹ {currentPaid.toLocaleString('en-IN')}
                  </span>
                  <span style={{ color: '#fbbf24' }}>
                    ⏳ Balance Due: ₹ {balanceDue.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Event Note / Remarks */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} color="#818cf8" />
              <span>Event Note / Remarks (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={formData.note || ''}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="form-input"
              placeholder="e.g. ₹5,000 Advance paid via UPI, Manager: Rahul, balance on setup"
              style={{
                resize: 'vertical',
                minHeight: '62px',
                fontFamily: 'inherit',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        {/* Form Actions (Sticky Footer) */}
        <div className="modal-actions-footer">
          <button
            type="submit"
            disabled={isSaving}
            className="btn btn-primary"
            style={{ flex: 2 }}
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving to Sheet...' : 'Save Entry'}</span>
          </button>

          {initialData && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onDelete(initialData)}
              className="btn btn-danger"
              style={{ flex: 1 }}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
