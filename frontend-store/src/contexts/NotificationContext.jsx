import { createContext, useContext, useMemo, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notice, setNotice] = useState(null);

  function notify(message, type = 'info') {
    setNotice({ message, type, id: Date.now() });
    window.setTimeout(() => {
      setNotice((current) => (current?.message === message ? null : current));
    }, 3200);
  }

  const value = useMemo(() => ({ notify }), []);
  const colorClass =
    notice?.type === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : notice?.type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-amber-200 bg-amber-50 text-amber-700';
  const NoticeIcon =
    notice?.type === 'error'
      ? FiAlertCircle
      : notice?.type === 'success'
        ? FiCheckCircle
        : FiInfo;

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notice && (
        <div
          key={notice.id}
          role="status"
          aria-live="polite"
          className={`ui-toast-in fixed right-4 top-4 z-50 flex max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur ${colorClass}`}
        >
          <NoticeIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice.message}</span>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used inside NotificationProvider');
  }

  return context;
}
