function ErrorState({ message = 'Không tải được dữ liệu.', onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center text-rose-700 shadow-sm">
      <p className="m-0">{message}</p>
      {onRetry && (
        <button
          type="button"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#171717] px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-black"
          onClick={onRetry}
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

export default ErrorState;
