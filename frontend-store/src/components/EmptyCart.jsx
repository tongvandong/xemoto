import { FiShoppingCart } from 'react-icons/fi';
import { Link } from 'react-router-dom';

function EmptyCart() {
  return (
    <div className="ui-fade-in flex flex-col items-center rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-6 py-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-zinc-400 shadow-sm" aria-hidden="true">
        <FiShoppingCart className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-[24px] font-black text-zinc-950">Giỏ hàng của bạn đang trống</h2>
      <p className="mt-2 max-w-md text-sm leading-7 text-zinc-500">Hãy chọn xe hoặc phụ tùng phù hợp trước khi thanh toán.</p>
      <Link
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#d71920] px-8 text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_14px_28px_rgba(215,25,32,0.25)] transition hover:bg-[#b61016] hover:shadow-[0_18px_34px_rgba(215,25,32,0.32)] active:scale-[0.98]"
        to="/products"
      >
        Mua sắm ngay
      </Link>
    </div>
  );
}

export default EmptyCart;
