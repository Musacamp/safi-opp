import { CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
const listeners: ((toast: ToastData) => void)[] = [];

export function showToast(message: string, type: ToastType = "info") {
  const toast = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(toast));
}

const config = {
  success: { icon: CheckCircle2, bg: "bg-success-500", text: "text-white" },
  error: { icon: XCircle, bg: "bg-danger-500", text: "text-white" },
  warning: { icon: AlertCircle, bg: "bg-warning-500", text: "text-white" },
  info: { icon: Info, bg: "bg-ocean-600", text: "text-white" },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const listener = (toast: ToastData) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3500);
    };
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => {
        const c = config[toast.type];
        const Icon = c.icon;
        return (
          <div
            key={toast.id}
            className={`${c.bg} ${c.text} rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 animate-slide-down`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
