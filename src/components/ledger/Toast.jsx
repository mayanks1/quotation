import React from 'react';
import { RotateCcw, CheckCircle, AlertTriangle, X } from 'lucide-react';

export default function Toast({ toast, onUndo, onClose }) {
  if (!toast) return null;

  const { message, type = 'info', hasUndo = false } = toast;

  return (
    <div className="toast-container">
      {type === 'success' && <CheckCircle size={18} color="#4ade80" />}
      {type === 'error' && <AlertTriangle size={18} color="#f87171" />}
      
      <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>
        {message}
      </span>

      {hasUndo && (
        <button
          onClick={onUndo}
          className="btn btn-success"
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          <RotateCcw size={14} />
          <span>Undo</span>
        </button>
      )}

      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          padding: '4px'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
