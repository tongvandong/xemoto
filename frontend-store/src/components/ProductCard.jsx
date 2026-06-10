import { Link } from 'react-router-dom';
import { FiHeart } from 'react-icons/fi';
import { formatCurrency, getProductDiscountPercent, getProductImage, getProductPrice } from '../utils/formatters.js';

function ProductCard({ product, onAddToCart, isFavorite = false, onToggleFavorite }) {
  const price = getProductPrice(product);
  const oldPrice = product.basePrice && product.basePrice > price ? product.basePrice : null;
  const discountPercent = getProductDiscountPercent(product);
  const imageUrl = getProductImage(product);
  const detailLink = `/products/${product.id}`;

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(15,23,42,0.12)]">
      {onToggleFavorite && (
        <button
          type="button"
          className={`absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition ${
            isFavorite
              ? 'border-[#d71920] bg-[#d71920] text-white'
              : 'border-white/80 bg-white/95 text-zinc-700 hover:border-[#d71920] hover:text-[#d71920]'
          }`}
          aria-label={isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(product)}
        >
          <FiHeart className={isFavorite ? 'h-5 w-5 fill-current' : 'h-5 w-5'} />
        </button>
      )}

      <Link className="relative block aspect-square bg-zinc-50 p-4" to={detailLink}>
        {discountPercent && (
          <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#d71920] px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white">
            -{discountPercent}%
          </span>
        )}

        <div className="h-full w-full">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-contain transition duration-300 hover:scale-[1.03]"
            />
          ) : (
            <span className="grid h-full w-full place-items-center rounded-xl bg-zinc-100 text-sm font-black uppercase tracking-[0.18em] text-zinc-400">
              EURO Moto
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 min-h-[20px] text-[12px] font-medium text-zinc-500">
          {product.brandName || product.categoryName || product.productType || 'EURO Moto'}
        </div>

        <Link className="block min-h-[56px] text-[15px] leading-7 font-bold text-zinc-900 transition hover:text-[#d71920]" to={detailLink}>
          {product.name}
        </Link>

        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span className="text-[18px] font-extrabold text-[#d71920]">{formatCurrency(price)}</span>
          {oldPrice && <span className="text-[13px] text-zinc-400 line-through">{formatCurrency(oldPrice)}</span>}
        </div>

        <div className="mt-auto pt-4">
          <Link
            className="mb-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
            to={detailLink}
          >
            Xem chi tiết
          </Link>

          {onAddToCart && (
            <button
              type="button"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#d71920] bg-white px-4 text-sm font-extrabold text-[#d71920] transition hover:bg-[#d71920] hover:text-white"
              onClick={() => onAddToCart(product)}
            >
              Thêm vào giỏ
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
