import { FiAlertTriangle } from 'react-icons/fi';

function ErrorState({ message = 'Không tải được dữ liệu.', onRetry }) {
  return (
    <div className="ui-fade-in flex flex-col items-center rounded-2xl border border-rose-200 bg-rose-50/70 px-6 py-10 text-center shadow-sm" role="alert">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600" aria-hidden="true">
        <FiAlertTriangle className="h-6 w-6" />
      </span>
      <p className="m-0 mt-4 text-sm font-semibold leading-6 text-rose-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-sm transition hover:bg-black hover:shadow-md active:scale-[0.98]"
          onClick={onRetry}
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

export default ErrorState;
