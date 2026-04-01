import React from 'react';
import { Warning, CheckCircle, Info, SignOut, X } from '@phosphor-icons/react';

/**
 * Reusable styled alert/confirm modal.
 *
 * Props:
 *  - open        : boolean  — whether to show the modal
 *  - title       : string   — heading text
 *  - message     : string   — body text (supports \n line breaks)
 *  - type        : 'info' | 'success' | 'warning' | 'danger' | 'logout'
 *  - confirmText : string   — confirm button label  (default "OK")
 *  - cancelText  : string   — cancel  button label  (null = no cancel button → alert mode)
 *  - onConfirm   : ()=>void — called on confirm
 *  - onCancel    : ()=>void — called on cancel / close
 */
const TYPE_CONFIG = {
  info:    { icon: Info,        gradient: 'from-indigo-500 to-blue-600',   iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', btnClass: 'bg-indigo-500 hover:bg-indigo-600' },
  success: { icon: CheckCircle, gradient: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', btnClass: 'bg-emerald-500 hover:bg-emerald-600' },
  warning: { icon: Warning,     gradient: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', btnClass: 'bg-amber-500 hover:bg-amber-600' },
  danger:  { icon: Warning,     gradient: 'from-red-500 to-rose-600',     iconBg: 'bg-red-100', iconColor: 'text-red-600', btnClass: 'bg-red-500 hover:bg-red-600' },
  logout:  { icon: SignOut,      gradient: 'from-red-500 to-rose-600',     iconBg: 'bg-red-100', iconColor: 'text-red-600', btnClass: 'bg-red-500 hover:bg-red-600' },
};

const AlertModal = ({
  open, title, message, type = 'info',
  confirmText = 'OK', cancelText = null,
  onConfirm, onCancel,
}) => {
  if (!open) return null;

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && onCancel) onCancel(); }}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ animation: 'alertScaleIn 0.2s ease' }}>
        
        {/* Gradient Header */}
        <div className={`bg-gradient-to-r ${cfg.gradient} p-6 relative`}>
          {onCancel && (
            <button onClick={onCancel}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Close">
              <X size={16} weight="bold" className="text-white" />
            </button>
          )}
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${cfg.iconBg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={26} weight="duotone" className={cfg.iconColor} />
            </div>
            <h2 className="text-xl font-extrabold text-white">{title}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-line">{message}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {cancelText && (
            <button onClick={onCancel}
              className="flex-1 py-3 rounded-2xl font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
              {cancelText}
            </button>
          )}
          <button onClick={onConfirm}
            className={`flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-colors ${cfg.btnClass}`}>
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes alertScaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1);    }
        }
      `}</style>
    </div>
  );
};

export default AlertModal;
