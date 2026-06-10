import { formatCurrency } from '../utils/formatters.js';

function CartSummary({ items, subtotal: backendSubtotal, onCheckout }) {
  const subtotal = backendSubtotal ?? items.reduce((sum, item) => {
    const quantity = item.quantity || 1;
    const price = item.unitPrice || item.product?.salePrice || item.product?.basePrice || 0;
    return sum + (item.lineTotal ?? price * quantity);
  }, 0);

  return (
    <aside className="sticky top-28 rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <h2 className="text-[22px] font-black text-zinc-950">Thông tin đơn hàng</h2>

      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4 text-sm text-zinc-600">
          <span>Tạm tính</span>
          <strong className="font-bold text-zinc-950">{formatCurrency(subtotal)}</strong>
        </div>

        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4 text-sm text-zinc-600">
          <span>Phí giao hàng</span>
          <strong className="font-bold text-zinc-950">{formatCurrency(0)}</strong>
        </div>

        <div className="flex items-center justify-between gap-4 text-[#d71920]">
          <span className="text-sm font-extrabold uppercase tracking-[0.08em]">Tổng cộng</span>
          <strong className="text-[24px] font-black">{formatCurrency(subtotal)}</strong>
        </div>
      </div>

      <button
        type="button"
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#d71920] px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016] disabled:cursor-not-allowed disabled:bg-zinc-300"
        onClick={onCheckout}
        disabled={!items.length}
      >
        Thanh toán
      </button>
    </aside>
  );
}

export default CartSummary;
