import { Link } from 'react-router-dom';
import QuantitySelector from './QuantitySelector.jsx';
import { formatCurrency, getProductImage } from '../utils/formatters.js';

function CartItemRow({ item, onQuantityChange, onRemove }) {
  const product = item.product || {};
  const variant = item.productVariant || {};
  const quantity = item.quantity || 1;
  const unitPrice = item.unitPrice || product.salePrice || product.basePrice || 0;
  const lineTotal = item.lineTotal ?? unitPrice * quantity;
  const stockValue = variant.stockQuantity ?? product.stockQuantity;
  const maxQuantity = stockValue === undefined || stockValue === null ? 99 : Math.max(1, Number(stockValue));
  const imageUrl = getProductImage(product);

  return (
    <div className="grid gap-4 rounded-[28px] border border-zinc-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:grid-cols-[104px_minmax(0,1fr)] xl:grid-cols-[104px_minmax(0,1fr)_168px_140px_auto] xl:items-center">
      <div className="overflow-hidden rounded-2xl bg-zinc-50">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name || 'Sản phẩm'} className="aspect-square w-full object-contain p-3" />
        ) : (
          <span className="grid aspect-square w-full place-items-center bg-zinc-100 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
            EURO Moto
          </span>
        )}
      </div>

      <div className="min-w-0">
        <Link className="line-clamp-2 text-lg font-bold text-zinc-950 transition hover:text-[#d71920]" to={`/products/${product.id || item.productId}`}>
          {product.name || 'Sản phẩm đang cập nhật'}
        </Link>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500">
          <span>{product.brandName || product.categoryName || 'EURO Moto'}</span>
          {(variant.variantName || variant.version || variant.color) && (
            <span>{[variant.variantName, variant.version, variant.color].filter(Boolean).join(' / ')}</span>
          )}
          <span>Mã: {product.productCode || item.productId || 'N/A'}</span>
        </div>
        <div className="mt-3 text-sm font-extrabold text-[#d71920]">{formatCurrency(unitPrice)}</div>
      </div>

      <div className="xl:justify-self-center">
        <QuantitySelector value={quantity} onChange={(value) => onQuantityChange(item.id, value)} max={maxQuantity} />
      </div>

      <strong className="text-lg font-black text-zinc-950 xl:justify-self-end">{formatCurrency(lineTotal)}</strong>

      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-rose-200 px-4 text-sm font-bold text-rose-600 transition hover:border-rose-500 hover:bg-rose-50"
        onClick={() => onRemove(item.id)}
      >
        Xóa
      </button>
    </div>
  );
}

export default CartItemRow;
