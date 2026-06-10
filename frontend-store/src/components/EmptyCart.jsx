import { Link } from 'react-router-dom';

function EmptyCart() {
  return (
    <div className="rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center">
      <h2 className="text-[24px] font-black text-zinc-950">Giỏ hàng của bạn đang trống</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-500">Hãy chọn xe hoặc phụ tùng phù hợp trước khi thanh toán.</p>
      <Link
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#d71920] px-6 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016]"
        to="/products"
      >
        Mua sắm ngay
      </Link>
    </div>
  );
}

export default EmptyCart;
