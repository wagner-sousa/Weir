import { useEffect, useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

let toastListeners: Array<(msg: ToastMessage) => void> = [];

export function showToast(text: string, type: ToastMessage['type'] = 'info') {
  const msg: ToastMessage = { id: `${Date.now()}-${Math.random()}`, text, type };
  toastListeners.forEach((fn) => fn(msg));
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className={`cursor-pointer rounded-lg px-4 py-3 text-sm text-white shadow-lg transition-all hover:opacity-90 ${
            toast.type === 'success'
              ? 'bg-green-600'
              : toast.type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
          }`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 3000);
    };
    toastListeners.push(handler);
    return () => {
      toastListeners = toastListeners.filter((h) => h !== handler);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismiss, ToastUI: () => <ToastContainer toasts={toasts} onDismiss={dismiss} /> };
}
