function LoadingState({ message = 'Đang tải dữ liệu...' }) {
  return (
    <div
      className="ui-fade-in flex flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <span className="ui-spinner" aria-hidden="true" />
      <span className="text-sm font-semibold text-zinc-500">{message}</span>
    </div>
  );
}

export default LoadingState;
