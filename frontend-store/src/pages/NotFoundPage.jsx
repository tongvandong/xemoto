import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-[720px] rounded-[36px] border border-zinc-200 bg-white px-6 py-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:px-10">
        <div className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">404</div>
        <h1 className="mt-3 text-[34px] leading-tight font-black text-zinc-950 sm:text-[42px]">Không tìm thấy trang</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-500">
          Liên kết bạn mở hiện không còn tồn tại hoặc đã được thay đổi. Bạn có thể quay lại trang chủ để tiếp tục duyệt sản phẩm.
        </p>
        <Link
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#d71920] px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016]"
          to="/"
        >
          Về trang chủ
        </Link>
      </div>
    </section>
  );
}

export default NotFoundPage;
