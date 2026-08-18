import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isDanger = t.type === 'danger';

        return (
          <div
            key={t.id}
            className="toast-item"
            style={{
              borderColor: isSuccess ? 'var(--status-success-border)' : isDanger ? 'var(--status-danger-border)' : 'var(--accent-cyan)',
              background: 'var(--bg-secondary)',
            }}
          >
            {isSuccess ? (
              <CheckCircle2 size={18} color="var(--status-success)" />
            ) : isDanger ? (
              <AlertCircle size={18} color="var(--status-danger)" />
            ) : (
              <Info size={18} color="var(--accent-cyan)" />
            )}

            <div style={{ flex: 1, fontSize: '0.86rem', color: 'var(--text-main)' }}>
              {t.message}
            </div>

            <button
              onClick={() => onDismiss(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
