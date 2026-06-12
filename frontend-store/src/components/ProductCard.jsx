import { Link } from 'react-router-dom';
import { FaRegStar, FaStar, FaStarHalfAlt } from 'react-icons/fa';
import { FiHeart } from 'react-icons/fi';
import { formatCurrency, formatDiscountPercent, getProductDiscountPercent, getProductImage, getProductPrice, isPriceFrom } from '../utils/formatters.js';

function getRatingValue(product) {
  const value = Number(product.averageRating ?? product.rating ?? 0);
  return Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;
}

function getReviewCount(product) {
  const value = Number(product.totalReviews ?? product.reviewCount ?? product.reviewsCount ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function getReviewLabel(count) {
  if (count <= 0) {
    return 'Chưa có đánh giá';
  }

  return `(${count} đánh giá)`;
}

function RatingStars({ rating }) {
  return (
    <span className="flex items-center gap-0.5 text-amber-400" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => {
        if (rating >= star - 0.25) {
          return <FaStar key={star} className="h-3.5 w-3.5" />;
        }

        if (rating >= star - 0.75) {
          return <FaStarHalfAlt key={star} className="h-3.5 w-3.5" />;
        }

        return <FaRegStar key={star} className="h-3.5 w-3.5 text-zinc-300" />;
      })}
    </span>
  );
}

function ProductCard({ product, onAddToCart, isFavorite = false, onToggleFavorite }) {
  const price = getProductPrice(product);
  const showFromPrice = isPriceFrom(product);
  const oldPrice = product.basePrice && product.basePrice > price ? product.basePrice : null;
  const discountPercent = getProductDiscountPercent(product);
  const imageUrl = getProductImage(product);
  const detailLink = `/products/${product.id}`;
  const rating = getRatingValue(product);
  const reviewCount = getReviewCount(product);
  const reviewLabel = getReviewLabel(reviewCount);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-[0_20px_40px_rgba(15,23,42,0.14)]">
      {onToggleFavorite && (
        <button
          type="button"
          className={`absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur transition active:scale-95 ${
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

      <Link className="relative block aspect-square overflow-hidden bg-zinc-50 p-4" to={detailLink}>
        {discountPercent && (
          <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#d71920] px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_6px_16px_rgba(215,25,32,0.35)]">
            -{formatDiscountPercent(discountPercent)}%
          </span>
        )}

        <div className="h-full w-full">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.04]"
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

        <div className="mt-2 flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-zinc-500">
          <span className="inline-flex shrink-0 items-center gap-2">
            <RatingStars rating={rating} />
            {reviewCount > 0 && <span className="text-zinc-800">{rating.toFixed(1)}</span>}
          </span>
          <span className="whitespace-nowrap">{reviewLabel}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span className="text-[18px] font-extrabold text-[#d71920]">{showFromPrice ? `Từ ${formatCurrency(price)}` : formatCurrency(price)}</span>
          {oldPrice && <span className="text-[13px] text-zinc-400 line-through">{formatCurrency(oldPrice)}</span>}
        </div>

        <div className="mt-auto pt-4">
          <Link
            className="mb-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:border-zinc-950 hover:bg-zinc-50 hover:text-zinc-950 active:scale-[0.98]"
            to={detailLink}
          >
            Xem chi tiết
          </Link>

          {onAddToCart && (
            <button
              type="button"
              className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#d71920] bg-white px-4 text-sm font-extrabold text-[#d71920] transition hover:bg-[#d71920] hover:text-white hover:shadow-[0_10px_22px_rgba(215,25,32,0.28)] active:scale-[0.98]"
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
