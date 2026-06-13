import { Link } from 'react-router-dom';
import { formatCurrency, getProductImage } from '../utils/formatters.js';

// Popover giỏ hàng nhỏ thả xuống từ icon giỏ hàng trên Header.
function MiniCartPopover({ cart, count, onClose }) {
  const items = cart?.items || [];
  const visibleItems = items.slice(0, 4);
  const subtotal = Number(cart?.subtotal ?? items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0));

  return (
    <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="text-sm font-black text-zinc-950">Giỏ hàng</div>
        <div className="text-xs font-medium text-zinc-500">{count || 0} sản phẩm</div>
      </div>

      <div className="max-h-[320px] overflow-y-auto p-3">
        {visibleItems.length ? (
          <div className="grid gap-3">
            {visibleItems.map((item) => {
              const product = item.product || {};
              const variant = item.productVariant || {};
              const imageUrl = getProductImage(product);
              const productName = product.name || 'Sản phẩm đang cập nhật';
              const variantText = [variant.variantName, variant.version, variant.color].filter(Boolean).join(' / ');
              const unitPrice = Number(item.unitPrice || product.salePrice || product.basePrice || 0);

              return (
                <div key={item.id || `${item.productId}-${item.productVariantId || 'base'}`} className="grid grid-cols-[58px_minmax(0,1fr)] gap-3">
                  <div className="overflow-hidden rounded-xl bg-zinc-50">
                    {imageUrl ? (
                      <img src={imageUrl} alt={productName} className="aspect-square w-full object-contain p-1.5" />
                    ) : (
                      <span className="grid aspect-square place-items-center text-[10px] font-black text-zinc-400">EURO</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-zinc-950">{productName}</div>
                    {variantText && <div className="truncate text-xs text-zinc-500">{variantText}</div>}
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-zinc-500">x{item.quantity || 1}</span>
                      <span className="font-black text-[#d71920]">{formatCurrency(unitPrice)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-sm font-semibold text-zinc-500">Giỏ hàng đang trống</div>
        )}
      </div>

      <div className="border-t border-zinc-100 p-4">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold text-zinc-500">Tạm tính</span>
          <span className="font-black text-zinc-950">{formatCurrency(subtotal)}</span>
        </div>
        <Link
          to="/cart"
          onClick={onClose}
          className="flex min-h-11 items-center justify-center rounded-xl bg-[#d71920] px-4 text-sm font-black text-white transition hover:bg-[#b61016]"
        >
          Xem giỏ hàng
        </Link>
      </div>
    </div>
  );
}

export default MiniCartPopover;
