import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Yes',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-surface rounded-2xl shadow-xl border border-stone-300 w-full max-w-sm p-6 animate-slide-up">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-text-muted mb-6">
          {message}
        </p>
        
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onCancel}
            className="btn-secondary"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className="btn-primary"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
