import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import type { ToastState } from '../types';

interface ToastProps {
  toast: ToastState | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  const Icon =
    toast.tone === 'error'
      ? AlertCircle
      : toast.tone === 'info'
        ? Info
        : CheckCircle2;

  const iconColor =
    toast.tone === 'error'
      ? 'text-rose-400'
      : toast.tone === 'info'
        ? 'text-sky-300'
        : 'text-[#D4AF37]';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 right-4 z-50 max-w-sm w-[calc(100%-2rem)] bg-[#07152B] text-white border border-white/15 rounded-xl p-4 shadow-xl flex items-start gap-3"
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#F3E5AB]">
          {toast.title}
        </h4>
        <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
