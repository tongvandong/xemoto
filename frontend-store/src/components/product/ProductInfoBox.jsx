import { FiHeart } from 'react-icons/fi';
import QuantitySelector from '../QuantitySelector.jsx';
import { formatCurrency, formatDiscountPercent, getProductDiscountPercent } from '../../utils/formatters.js';

export const defaultPromotions = [
  'Áp dụng Phiếu quà tặng / Mã giảm giá theo sản phẩm.',
  'Giảm giá 10% khi mua từ 5 sản phẩm trở lên.',
  'Tặng 100.000đ mua hàng online tại hệ thống EURO Moto.',
];

function normalizeText(value) {
  return (value || '').trim().toLowerCase();
}

function buildColorStops(name) {
  const palette = {
    bac: '#c7ccd4',
    bạc: '#c7ccd4',
    do: '#d71920',
    đỏ: '#d71920',
    den: '#171717',
    đen: '#171717',
    xanh: '#0f6ab4',
    xam: '#6b7280',
    xám: '#6b7280',
    vang: '#c99a06',
    vàng: '#c99a06',
    trang: '#f3f4f6',
    trắng: '#f3f4f6',
  };

  const stops = name
    .split(/\s+/)
    .map((part) => palette[normalizeText(part)])
    .filter(Boolean);

  return stops.length ? stops : ['#d1d5db'];
}

function buildColorStyle(name) {
  const stops = buildColorStops(name);

  if (stops.length === 1) {
    return { background: stops[0] };
  }

  const step = 100 / stops.length;
  const segments = stops.map((color, index) => {
    const start = Math.round(index * step);
    const end = Math.round((index + 1) * step);
    return `${color} ${start}% ${end}%`;
  });

  return { backgroundImage: `linear-gradient(135deg, ${segments.join(', ')})` };
}

function ProductInfoBox({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  onBuyNow,
  selectedVersion,
  onSelectVersion,
  selectedColor,
  onSelectColor,
  selectedVariant,
  versionOptions,
  colorOptions,
  availableColorOptions,
  showVersionSelector = true,
  showColorSelector = true,
  colorStatusText = 'Đang cập nhật',
  fallbackNotes = [],
  isFavorite = false,
  onToggleFavorite,
}) {
  // Giá hiển thị theo biến thể đang chọn (giá thật nằm ở biến thể). Fallback giá tổng hợp của sản phẩm.
  const productBasePrice = Number(product?.basePrice || 0);
  const productSalePrice = Number(product?.salePrice ?? productBasePrice);
  const variantBasePrice = selectedVariant?.basePrice == null ? null : Number(selectedVariant.basePrice);
  const variantSellPrice = selectedVariant?.sellPrice != null && Number(selectedVariant.sellPrice) > 0
    ? Number(selectedVariant.sellPrice)
    : (selectedVariant?.salePrice != null ? Number(selectedVariant.salePrice) : null);
  const originalPrice = variantBasePrice ?? productBasePrice;
  const sellingPrice = variantSellPrice ?? (originalPrice > 0 ? originalPrice : productSalePrice);
  const formattedSellingPrice = sellingPrice > 0 ? formatCurrency(sellingPrice) : 'Liên hệ';
  const discountPercent = selectedVariant?.discountPercent ?? getProductDiscountPercent(product);
  const hasOriginalPrice = originalPrice > 0 && originalPrice > sellingPrice;
  const stockValue = selectedVariant?.stockQuantity ?? product?.stockQuantity;
  const hasKnownStock = stockValue !== undefined && stockValue !== null;
  const isInStock = hasKnownStock
    ? Number(stockValue) > 0
    : normalizeText(selectedVariant?.status || product?.status).includes('available');
  const maxQuantity = hasKnownStock ? Math.max(Number(stockValue), 1) : 99;
  const isPartProduct = Number(product?.kind) === 2 || normalizeText(product?.kind) === 'part';
  const versionLabel = isPartProduct ? 'Quy cách' : 'Phiên bản';
  const colorLabel = isPartProduct ? 'Tùy chọn' : 'Màu sắc';
  const quickInfoItems = isPartProduct
    ? [
      ['Mã sản phẩm', product?.productCode || product?.code || 'Đang cập nhật'],
      ['SKU', selectedVariant?.sku || 'Đang cập nhật'],
      ['Quy cách', selectedVariant?.version || selectedVariant?.variantName || selectedVersion || 'Đang cập nhật'],
      ['Tồn kho', stockValue ?? 'Liên hệ'],
    ]
    : [
      ['Động cơ', product?.engine || 'Đang cập nhật'],
      ['Nhiên liệu', product?.fuelType || 'Đang cập nhật'],
      ['Màu ngoại thất', selectedVariant?.exteriorColor || product?.exteriorColor || selectedColor || colorStatusText],
      ['Tồn kho', stockValue ?? 'Liên hệ'],
    ];
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="border-b border-zinc-100 pb-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-zinc-950 sm:text-4xl">{product?.name}</h1>
          {onToggleFavorite && (
            <button
              type="button"
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition ${
                isFavorite
                  ? 'border-[#d71920] bg-[#d71920] text-white shadow-[0_14px_28px_rgba(215,25,32,0.22)]'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-[#d71920] hover:text-[#d71920]'
              }`}
              aria-label={isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
              aria-pressed={isFavorite}
              onClick={onToggleFavorite}
            >
              <FiHeart className={isFavorite ? 'h-5 w-5 fill-current' : 'h-5 w-5'} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6 pt-5">
        <div className="rounded-2xl bg-[#fff5f5] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-zinc-500">Giá bán</div>
            {discountPercent && (
              <span className="rounded-full bg-[#d71920] px-3 py-1 text-xs font-extrabold text-white">
                Giảm {formatDiscountPercent(discountPercent)}%
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-col items-start gap-1">
            <span className="text-3xl font-bold text-[#d71920]">{formattedSellingPrice}</span>
            {hasOriginalPrice && (
              <span className="text-base font-semibold text-zinc-400 line-through">{formatCurrency(originalPrice)}</span>
            )}
          </div>
        </div>

        {showVersionSelector && (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-zinc-950">{versionLabel}</h2>
              {selectedVersion && <span className="text-sm text-zinc-500">{selectedVersion}</span>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {versionOptions.map((option) => {
                const active = option === selectedVersion;

                return (
                  <button
                    key={option}
                    type="button"
                    className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      active ? 'border-[#d71920] bg-[#fff5f5] text-[#d71920]' : 'border-zinc-200 bg-white text-zinc-700 hover:border-[#d71920]'
                    }`}
                    onClick={() => onSelectVersion(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-zinc-950">{colorLabel}</h2>
          </div>
          {showColorSelector ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {colorOptions.map((option) => {
                const active = option === selectedColor;
                const available = availableColorOptions.includes(option);

                return (
                  <button
                    key={option}
                    type="button"
                    className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      active ? 'border-[#d71920] bg-[#fff5f5] text-[#d71920]' : 'border-zinc-200 bg-white text-zinc-700 hover:border-[#d71920]'
                    } ${available ? '' : 'opacity-60'}`}
                    onClick={() => onSelectColor(option)}
                  >
                    {!isPartProduct && <span className="h-8 w-8 shrink-0 rounded-full border border-white shadow-sm" style={buildColorStyle(option)} />}
                    <span className="flex-1">{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">{colorStatusText}</div>
          )}
        </div>

        {!isPartProduct && fallbackNotes.length > 0 && (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {fallbackNotes.join(' ')}
          </div>
        )}

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex flex-col gap-3">
            <QuantitySelector value={quantity} onChange={onQuantityChange} max={maxQuantity} />
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#d71920] px-5 text-sm font-bold text-white transition hover:bg-[#b61016] disabled:cursor-not-allowed disabled:bg-zinc-300"
                onClick={onAddToCart}
                disabled={!isInStock}
              >
                Thêm vào giỏ hàng
              </button>
              <button
                type="button"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-zinc-900 bg-white px-5 text-sm font-bold text-zinc-900 transition hover:border-[#d71920] hover:text-[#d71920] disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
                onClick={onBuyNow}
                disabled={!isInStock}
              >
                Mua ngay
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h3 className="text-base font-bold text-zinc-950">Thông tin nhanh</h3>
          <div className="mt-3 grid gap-3 text-sm text-zinc-600 sm:grid-cols-2">
            {quickInfoItems.map(([label, value]) => (
              <div key={label}>
                <span className="font-semibold text-zinc-900">{label}:</span> {value}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductInfoBox;
