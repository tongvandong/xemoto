import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';
import { reviewApi } from '../../services/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

/* ============================================================
   RatingStars — display or interactive star selector
   ============================================================ */
function RatingStars({ value = 0, size = 16, interactive = false, onChange }) {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = interactive && hoverValue > 0 ? hoverValue : Number(value || 0);

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => interactive && setHoverValue(0)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.floor(displayValue);
        const half = !filled && star - 0.5 <= displayValue;
        const Icon = filled ? FaStar : half ? FaStarHalfAlt : FaRegStar;
        const colorClass = filled || half ? 'text-amber-400' : 'text-gray-300';

        if (!interactive) {
          return <Icon key={star} size={size} className={colorClass} />;
        }

        return (
          <button
            key={star}
            type="button"
            className="rounded-sm p-0.5 transition-transform duration-150 hover:scale-125 focus:outline-none"
            onMouseEnter={() => setHoverValue(star)}
            onClick={() => onChange?.(star)}
            aria-label={`${star} sao`}
          >
            <FaStar
              size={size}
              className={star <= displayValue ? 'text-amber-400' : 'text-gray-300'}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   RatingBar — single row in the rating distribution
   ============================================================ */
function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-7 text-right font-medium text-gray-600">{star}</span>
      <FaStar size={12} className="text-amber-400" />
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-gray-500">{count}</span>
    </div>
  );
}

/* ============================================================
   Avatar — letter avatar from username
   ============================================================ */
function UserAvatar({ name }) {
  const letter = (name || '?')[0].toUpperCase();
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-orange-500', 'bg-teal-500', 'bg-pink-500', 'bg-indigo-500',
  ];
  const idx = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${colors[idx]}`}>
      {letter}
    </div>
  );
}

/* ============================================================
   Helpers
   ============================================================ */
function formatReviewDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function ratingLabel(rating) {
  if (rating >= 4.5) return 'Xuất sắc';
  if (rating >= 3.5) return 'Tốt';
  if (rating >= 2.5) return 'Trung bình';
  if (rating >= 1.5) return 'Kém';
  return 'Rất kém';
}

function getReviewStatusLabel(status) {
  if (status === 'Approved') return 'Đã hiển thị';
  if (status === 'Hidden' || status === 'Rejected') return 'Không hiển thị';
  return 'Chờ duyệt';
}

function getReviewStatusClass(status) {
  if (status === 'Approved') return 'bg-green-100 text-green-700';
  if (status === 'Hidden' || status === 'Rejected') return 'bg-zinc-100 text-zinc-600';
  return 'bg-amber-100 text-amber-700';
}

/* ============================================================
   ReviewSummary
   ============================================================ */
function ReviewSummary({ summary, reviews }) {
  const avg = Number(summary.averageRating || 0);
  const total = summary.totalReviews || reviews.length;

  const distribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const s = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 0)));
      dist[s] = (dist[s] || 0) + 1;
    });
    return dist;
  }, [reviews]);

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm sm:flex-row sm:items-center">
      {/* Left: Big number */}
      <div className="flex flex-col items-center gap-1 sm:min-w-[140px]">
        <span className="text-5xl font-black tracking-tight text-gray-900">{avg.toFixed(1)}</span>
        <RatingStars value={avg} size={20} />
        <span className="mt-1 text-sm font-medium text-gray-500">
          {total > 0 ? `(${total} đánh giá)` : 'Chưa có đánh giá'}
        </span>
        {total > 0 && (
          <span className="rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">
            {ratingLabel(avg)}
          </span>
        )}
      </div>

      {/* Right: Distribution bars */}
      {total > 0 && (
        <div className="flex flex-1 flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <RatingBar key={star} star={star} count={distribution[star]} total={total} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ReviewCard
   ============================================================ */
function ReviewCard({ review, isMine = false }) {
  return (
    <div className={`rounded-xl border bg-white p-5 transition-shadow hover:shadow-md ${isMine ? 'border-amber-200' : 'border-gray-100'}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={review.userName} />
          <div>
            <div className="font-semibold text-gray-900">
              {isMine ? 'Đánh giá của bạn' : review.userName || `Khách hàng #${review.userId}`}
            </div>
            <div className="text-xs text-gray-400">{formatReviewDate(review.createdAt)}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RatingStars value={review.rating} size={14} />
          {isMine && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${getReviewStatusClass(review.status)}`}>
              {getReviewStatusLabel(review.status)}
            </span>
          )}
        </div>
      </div>

      {review.title && <h4 className="mb-1 text-sm font-bold text-gray-800">{review.title}</h4>}
      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{review.comment}</p>

      {review.imageUrl && (
        <div className="mt-3">
          <img
            src={review.imageUrl}
            alt="Ảnh đánh giá"
            className="h-20 w-20 cursor-pointer rounded-lg border border-gray-200 object-cover transition-transform hover:scale-105"
            onClick={() => window.open(review.imageUrl, '_blank')}
          />
        </div>
      )}
    </div>
  );
}

function MyReviewCard({ review }) {
  if (!review) return null;

  const isApproved = review.status === 'Approved';

  return (
    <div className={`space-y-3 rounded-2xl border p-4 ${isApproved ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
      <div>
        <h4 className={`text-sm font-black ${isApproved ? 'text-green-900' : 'text-amber-900'}`}>Đánh giá bạn đã gửi</h4>
        <p className={`mt-1 text-xs leading-5 ${isApproved ? 'text-green-700' : 'text-amber-700'}`}>
          {isApproved
            ? 'Đánh giá đã được duyệt và đang hiển thị công khai.'
            : 'Đánh giá sẽ xuất hiện trong danh sách công khai sau khi cửa hàng duyệt.'}
        </p>
      </div>
      <ReviewCard review={review} isMine />
    </div>
  );
}

/* ============================================================
   ReviewList
   ============================================================ */
function ReviewList({ reviews, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-amber-400" />
        <span className="text-sm text-gray-500">Đang tải đánh giá...</span>
      </div>
    );
  }

  if (!reviews.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-14 text-center">
        <div className="flex items-center gap-1 text-gray-300">
          {[1, 2, 3, 4, 5].map((s) => (
            <FaRegStar key={s} size={28} />
          ))}
        </div>
        <p className="text-sm font-medium text-gray-500">Chưa có đánh giá nào cho sản phẩm này.</p>
        <p className="text-xs text-gray-400">Hãy là người đầu tiên đánh giá sau khi mua sản phẩm!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}

/* ============================================================
   ReviewForm — handles all conditional states
   ============================================================ */
function ReviewForm({ productId, reviewState, stateLoading, isAuthenticated, myReview, onSubmitSuccess }) {
  const [rating, setRating] = useState(myReview?.rating || 5);
  const [comment, setComment] = useState(myReview?.comment || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating || 5);
      setComment(myReview.comment || '');
    } else {
      setRating(5);
      setComment('');
    }
  }, [myReview]);

  const canSubmit = rating >= 1 && rating <= 5 && comment.trim().length > 0 && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!comment.trim()) {
      setError('Vui lòng nhập nội dung bình luận.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        rating,
        comment: comment.trim(),
        orderId: reviewState?.eligibleOrderId || myReview?.orderId,
      };

      await reviewApi.create(productId, payload);

      setSuccess('Cảm ơn bạn đã gửi đánh giá!');
      onSubmitSuccess?.();

      // Auto-hide success after 3s
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Không thể lưu đánh giá. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  /* --- Not authenticated --- */
  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
        <h4 className="mb-2 text-sm font-bold text-amber-800">Đăng nhập để đánh giá</h4>
        <p className="text-sm text-amber-700">
          Vui lòng{' '}
          <Link to={`/login?redirect=/products/${productId}`} className="font-bold text-[#d71920] underline underline-offset-2 hover:text-[#b9161c]">
            đăng nhập
          </Link>{' '}
          để đánh giá sản phẩm này.
        </p>
      </div>
    );
  }

  /* --- Loading state check --- */
  if (stateLoading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-5">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        <span className="text-sm text-gray-500">Đang kiểm tra điều kiện đánh giá...</span>
      </div>
    );
  }

  /* --- Not purchased: don't show anything --- */
  if (!reviewState?.hasPurchased) {
    return null;
  }

  if (myReview) {
    return null;
  }

  /* --- Form (can review) --- */
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-base font-bold text-gray-900">
        ⭐ Viết đánh giá
      </h4>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Star selector */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">Chọn số sao</label>
          <div className="flex items-center gap-3">
            <RatingStars value={rating} size={32} interactive onChange={setRating} />
            <span className="text-sm font-medium text-amber-600">{rating}/5</span>
          </div>
        </div>

        {/* Comment textarea */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">Nội dung đánh giá</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-[#d71920] focus:bg-white focus:ring-2 focus:ring-[#d71920]/10"
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
          />
          <div className="mt-1 text-right text-xs text-gray-400">{comment.length}/1000</div>
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            ✅ {success}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#d71920] px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#b9161c] hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Đang gửi...
            </>
          ) : (
            'Gửi đánh giá'
          )}
        </button>
      </form>
    </div>
  );
}

/* ============================================================
   ProductReviews — main component
   ============================================================ */
export default function ProductReviews({ productId }) {
  const { isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [reviewState, setReviewState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stateLoading, setStateLoading] = useState(false);

  const myReview = reviewState?.myReview;
  const approvedMyReview = useMemo(() => {
    if (!myReview?.id) return null;
    return reviews.find((review) => review.id === myReview.id && review.status === 'Approved') || null;
  }, [myReview, reviews]);
  const displayedMyReview = useMemo(
    () => (approvedMyReview ? { ...myReview, ...approvedMyReview } : myReview),
    [approvedMyReview, myReview],
  );
  const publicReviews = useMemo(() => {
    if (!displayedMyReview?.id || displayedMyReview.status === 'Approved') return reviews;
    return reviews.filter((review) => review.id !== displayedMyReview.id);
  }, [displayedMyReview, reviews]);
  const shouldShowMyReviewCard = displayedMyReview && displayedMyReview.status !== 'Approved';

  const loadReviews = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [nextReviews, nextSummary] = await Promise.all([
        reviewApi.getByProduct(productId),
        reviewApi.getSummary(productId),
      ]);
      setReviews(nextReviews);
      setSummary(nextSummary);
    } catch {
      setReviews([]);
      setSummary({ averageRating: 0, totalReviews: 0 });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const loadReviewState = useCallback(async () => {
    if (!productId || !isAuthenticated) {
      setReviewState(null);
      return;
    }
    setStateLoading(true);
    try {
      const nextState = await reviewApi.getMine(productId);
      setReviewState(nextState);
    } catch (err) {
      setReviewState({
        canReview: false,
        hasPurchased: false,
        reason: err.message || 'Không kiểm tra được điều kiện đánh giá.',
      });
    } finally {
      setStateLoading(false);
    }
  }, [productId, isAuthenticated]);

  useEffect(() => { loadReviews(); }, [loadReviews]);
  useEffect(() => { loadReviewState(); }, [loadReviewState]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        loadReviews();
        loadReviewState();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadReviews, loadReviewState]);

  useEffect(() => {
    if (!myReview || displayedMyReview?.status === 'Approved') return undefined;

    const timer = window.setInterval(() => {
      loadReviews();
      loadReviewState();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [displayedMyReview, loadReviews, loadReviewState, myReview]);

  const handleSubmitSuccess = useCallback(() => {
    loadReviews();
    loadReviewState();
  }, [loadReviews, loadReviewState]);

  return (
    <section className="mt-8 space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-6 w-1 rounded-full bg-[#d71920]" />
        <h3 className="text-xl font-bold text-gray-900">Đánh giá sản phẩm</h3>
      </div>

      {/* Rating summary */}
      <ReviewSummary summary={summary} reviews={reviews} />

      {shouldShowMyReviewCard && <MyReviewCard review={displayedMyReview} />}

      {/* Review form */}
      <ReviewForm
        productId={productId}
        reviewState={reviewState}
        stateLoading={stateLoading}
        isAuthenticated={isAuthenticated}
        myReview={displayedMyReview}
        onSubmitSuccess={handleSubmitSuccess}
      />

      {/* Review list */}
      <ReviewList reviews={publicReviews} loading={loading} />
    </section>
  );
}
