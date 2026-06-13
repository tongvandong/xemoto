import { FiStar, FiX } from 'react-icons/fi';
import { getReviewableOrderItems } from '../../utils/reviewEligibility.js';

// Modal chọn sản phẩm cần đánh giá khi đơn hàng có nhiều hơn 1 sản phẩm đủ điều kiện.
function ReviewProductPicker({ order, reviewStatusByProductId = {}, onClose, onPick }) {
  if (!order) return null;

  const items = getReviewableOrderItems(order, reviewStatusByProductId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-xl rounded-[22px] bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Đóng"
        >
          <FiX className="h-5 w-5" />
        </button>
        <div className="pr-10">
          <h3 className="text-lg font-black text-zinc-950">Chọn sản phẩm để đánh giá</h3>
          <p className="mt-1 text-sm text-zinc-500">Đơn #{order.orderCode || order.id}</p>
        </div>
        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <button
              key={item.id || item.productId || index}
              type="button"
              onClick={() => onPick(item)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-amber-300 hover:bg-amber-50/50"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-zinc-950">
                  {item.productNameSnapshot || item.productName || item.name || 'Sản phẩm'}
                </div>
                {item.skuSnapshot && <div className="mt-0.5 text-xs font-medium text-zinc-400">SKU: {item.skuSnapshot}</div>}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700">
                <FiStar className="h-3.5 w-3.5" />
                Đánh giá
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReviewProductPicker;
