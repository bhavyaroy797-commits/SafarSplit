import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { dismissToast } from '../../features/ui/uiSlice';

const styles = {
  success: {
    icon: CheckCircle2,
    ring: 'text-emerald-500',
    bg: 'bg-emerald-50 border-emerald-100',
  },
  error: {
    icon: XCircle,
    ring: 'text-red-500',
    bg: 'bg-red-50 border-red-100',
  },
  warn: {
    icon: AlertTriangle,
    ring: 'text-amber-500',
    bg: 'bg-amber-50 border-amber-100',
  },
  info: {
    icon: Info,
    ring: 'text-brand-500',
    bg: 'bg-brand-50 border-brand-100',
  },
};

function ToastItem({ toast }) {
  const dispatch = useDispatch();
  const s = styles[toast.type] || styles.info;
  const Icon = s.icon;

  useEffect(() => {
    const t = setTimeout(
      () => dispatch(dismissToast(toast.id)),
      toast.ttl || 4000
    );
    return () => clearTimeout(t);
  }, [toast, dispatch]);

  return (
    <div
      className={`flex w-[320px] items-start gap-3 rounded-panel border ${s.bg} px-4 py-3 shadow-card animate-toast-in`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.ring}`} />
      <p className="flex-1 text-sm text-ink">{toast.message}</p>
      <button
        onClick={() => dispatch(dismissToast(toast.id))}
        className="text-muted hover:text-ink"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function ToastStack() {
  const toasts = useSelector((s) => s.ui.toasts);
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[200] flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}