import { createContext, useContext, useMemo, useState } from 'react';

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

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notice && (
        <div className={`fixed right-4 top-4 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_40px_rgba(15,23,42,0.14)] ${colorClass}`}>
          {notice.message}
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
