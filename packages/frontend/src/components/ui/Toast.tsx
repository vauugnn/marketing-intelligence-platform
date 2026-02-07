import { create } from 'zustand';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

const toastConfig = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-950/90',
    border: 'border-green-500',
    text: 'text-green-200',
    iconColor: 'text-green-400',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-950/90',
    border: 'border-red-500',
    text: 'text-red-200',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-950/90',
    border: 'border-yellow-500',
    text: 'text-yellow-200',
    iconColor: 'text-yellow-400',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-950/90',
    border: 'border-blue-500',
    text: 'text-blue-200',
    iconColor: 'text-blue-400',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            className={`animate-slide-in-right flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg backdrop-blur min-w-[320px] max-w-[420px] ${config.bg} ${config.border} ${config.text}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
