function LoadingState({ message = 'Đang tải dữ liệu...' }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-zinc-500 shadow-sm">
      {message}
    </div>
  );
}

export default LoadingState;
