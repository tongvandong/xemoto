import { FiLoader } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters.js';

// Cột phải trang thanh toán: danh sách sản phẩm, voucher, bảng giá và nút đặt hàng.
// Toàn bộ state/handler vẫn nằm ở CheckoutPage — component này chỉ hiển thị.
function CheckoutSummary({
  items,
  totals,
  shipping,
  voucher,
  onVoucherCodeChange,
  onApplyVoucher,
  onApplySuggestedVoucher,
  onRemoveVoucher,
  submitting,
  submitDisabled,
}) {
  const {
    subtotal, shippingFee, originalShippingFee, shippingDiscount, carrierName,
    voucherDiscount, totalAmount, depositNum, remainingAmount,
    needsDownPayment, isInstallment,
  } = totals;

  return (
    <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
      <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <h2 className="text-[22px] font-black text-zinc-950">Đơn hàng của bạn</h2>

        <div className="mt-5 max-h-[340px] space-y-3 overflow-y-auto pr-1">
          {items.map((item) => {
            const name = item.product?.name || item.productName || 'Sản phẩm';
            const variant = item.productVariant || {};
            const variantName = variant.variantName || [variant.version, variant.color].filter(Boolean).join(' / ') || item.variantName || '';
            const price = item.unitPrice || item.product?.salePrice || item.product?.basePrice || 0;
            const qty = item.quantity || 1;
            const lineTotal = item.lineTotal ?? price * qty;
            return (
              <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-bold text-zinc-900">{name}</div>
                  {variantName && <div className="mt-0.5 truncate text-xs text-zinc-500">{variantName}</div>}
                  <div className="mt-1 text-xs text-zinc-500">SL: {qty}</div>
                </div>
                <div className="whitespace-nowrap text-sm font-bold text-zinc-900">{formatCurrency(lineTotal)}</div>
              </div>
            );
          })}
          {!items.length && <div className="py-6 text-center text-sm text-zinc-400">Giỏ hàng trống</div>}
        </div>

        {/* Voucher */}
        <div className="mt-5 border-t border-zinc-200 pt-4">
          <h3 className="text-sm font-bold text-zinc-700">Mã giảm giá</h3>
          {voucher.applied ? (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
              <span className="text-lg">🎫</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-green-700">{voucher.applied.code}</div>
                <div className="text-xs text-green-600">
                  {voucher.applied.discountType === 'FreeShipping' ? 'Áp dụng voucher miễn phí vận chuyển' : `Giảm ${formatCurrency(voucherDiscount)}`}
                </div>
              </div>
              <button type="button" onClick={onRemoveVoucher} className="text-xs font-bold text-red-500 hover:text-red-700 transition">Xóa</button>
            </div>
          ) : (
            <>
              {voucher.loadingSuggestions ? (
                <div className="mt-2 text-sm text-zinc-500">Đang tải mã giảm giá...</div>
              ) : voucher.suggestions.length > 0 ? (
                <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {voucher.suggestions.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 rounded-xl border border-[#d71920]/20 bg-red-50/30 p-3">
                      <span className="text-2xl">🎫</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#d71920]">{v.code}</div>
                        <div className="text-xs text-zinc-600">{v.description || `Giảm ${v.discountType === 'Percent' ? v.discountValue + '%' : formatCurrency(v.discountValue)}`}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplySuggestedVoucher(v)}
                        disabled={voucher.loading}
                        className="shrink-0 rounded-lg bg-[#d71920] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#b61016] disabled:bg-zinc-300 disabled:cursor-not-allowed"
                      >
                        Áp dụng
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-zinc-500">Không có mã giảm giá nào phù hợp cho đơn hàng này</div>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={voucher.code}
                  onChange={onVoucherCodeChange}
                  placeholder="Nhập mã voucher"
                  className="flex-1 min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-[#d71920] focus:ring-2 focus:ring-[#d71920]/20"
                />
                <button
                  type="button"
                  onClick={onApplyVoucher}
                  disabled={voucher.loading || !voucher.code.trim()}
                  className="shrink-0 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-900 disabled:bg-zinc-300 disabled:cursor-not-allowed"
                >
                  {voucher.loading ? '...' : 'Áp dụng'}
                </button>
              </div>
              {voucher.error && <p className="mt-2 text-xs font-medium text-red-500">{voucher.error}</p>}
            </>
          )}
        </div>

        {/* Bảng giá */}
        <div className="mt-5 space-y-3 border-t border-zinc-200 pt-4">
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>Tạm tính ({items.length} sản phẩm)</span>
            <strong className="font-bold text-zinc-950">{formatCurrency(subtotal)}</strong>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>Phí giao hàng{carrierName ? ` (${carrierName})` : ''}</span>
            <strong className="font-bold text-zinc-950">{shipping.loading ? 'Đang tính...' : formatCurrency(shippingFee)}</strong>
          </div>
          {shipping.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{shipping.error}</div>
          )}
          {shippingDiscount > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>Voucher miễn phí vận chuyển</span>
              <strong className="font-bold">-{formatCurrency(shippingDiscount)}</strong>
            </div>
          )}
          {shippingDiscount > 0 && originalShippingFee > shippingFee && (
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Phí vận chuyển gốc</span>
              <span>{formatCurrency(originalShippingFee)}</span>
            </div>
          )}
          {voucherDiscount > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>Giảm voucher</span>
              <strong className="font-bold">-{formatCurrency(voucherDiscount)}</strong>
            </div>
          )}
          {needsDownPayment && (
            <>
              <div className="flex items-center justify-between text-sm text-amber-600">
                <span>{isInstallment ? 'Trả trước' : 'Đặt cọc'}</span>
                <strong className="font-bold">{formatCurrency(depositNum)}</strong>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-500">
                <span>{isInstallment ? 'Còn lại do đối tác tài chính xử lý' : 'Còn lại cần thanh toán'}</span>
                <strong className="font-bold">{formatCurrency(remainingAmount > 0 ? remainingAmount : 0)}</strong>
              </div>
            </>
          )}
          <div className="flex items-center justify-between pt-2 text-[#d71920]">
            <span className="text-sm font-extrabold uppercase tracking-[0.08em]">Tổng cộng</span>
            <strong className="text-[24px] font-black">{formatCurrency(totalAmount)}</strong>
          </div>
        </div>

        <button
          type="submit" form="checkout-form" disabled={submitDisabled}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#d71920] px-5 text-sm font-extrabold uppercase tracking-[0.08em] text-white transition hover:bg-[#b61016] disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {submitting ? (
            <>
              <FiLoader className="h-4 w-4 animate-spin" />
              Đang xử lý...
            </>
          ) : isInstallment ? 'Gửi hồ sơ trả góp' : 'Đặt hàng'}
        </button>
        <Link to="/cart" className="mt-3 flex items-center justify-center gap-1 text-sm font-bold text-zinc-500 transition hover:text-zinc-900">← Quay lại giỏ hàng</Link>
      </div>
    </aside>
  );
}

export default CheckoutSummary;
