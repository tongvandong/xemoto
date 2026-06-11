import { useState } from 'react';
import { reviewApi } from '../../services/api.js';
import { FaStar } from 'react-icons/fa';
import { FiUpload, FiX } from 'react-icons/fi';

export default function ReviewModal({ isOpen, onClose, product, orderId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen || !product) return null;

  const productId = product.productId || product.id || product.maSanPham || product.MaSanPham;
  const productName = product.productNameSnapshot || product.productName || product.name || 'Sản phẩm';
  const displayRating = hoverRating > 0 ? hoverRating : rating;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Ảnh không được vượt quá 5MB.');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Vui lòng nhập nội dung đánh giá.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await reviewApi.create(productId, {
        rating,
        comment: content.trim(),
        title: title.trim() || undefined,
        orderId,
        image: image || undefined,
      });
      onSubmitted?.({ productId, orderId });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset state
        setRating(5);
        setTitle('');
        setContent('');
        setImage(null);
        setImagePreview(null);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = rating >= 1 && rating <= 5 && content.trim().length > 0 && !submitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <FiX size={22} />
        </button>

        <h3 className="text-xl font-bold text-gray-900 mb-1">Đánh giá sản phẩm</h3>
        <p className="text-sm text-gray-500 mb-6 pr-8 truncate">{productName}</p>

        {success ? (
          <div className="text-center py-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-lg font-bold text-gray-900">Cảm ơn bạn đã đánh giá!</p>
            <p className="mt-2 text-sm text-gray-500">Đánh giá của bạn sẽ giúp ích cho người mua sau.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Star rating */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Đánh giá của bạn</p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <FaStar
                        size={32}
                        className={star <= displayRating ? 'text-amber-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm font-medium text-amber-600">{displayRating}/5</span>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tiêu đề (tùy chọn)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tóm tắt đánh giá (VD: Sản phẩm rất tốt)"
                maxLength={255}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#d71920] focus:bg-white focus:ring-2 focus:ring-[#d71920]/10"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nội dung đánh giá <span className="text-red-500">*</span></label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                rows={4}
                maxLength={1000}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-[#d71920] focus:bg-white focus:ring-2 focus:ring-[#d71920]/10"
              />
              <div className="mt-1 text-right text-xs text-gray-400">{content.length}/1000</div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Thêm hình ảnh (không bắt buộc)</label>
              <div className="flex items-center gap-4">
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 transition-colors hover:border-[#d71920] hover:bg-red-50/50">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <FiUpload size={20} className="mb-1 text-gray-400" />
                  <span className="text-xs text-gray-400">Tải ảnh</span>
                </label>
                {imagePreview && (
                  <div className="relative h-24 w-24">
                    <img src={imagePreview} alt="Preview" className="h-full w-full rounded-xl border border-gray-200 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImage(null); setImagePreview(null); }}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-red-500 shadow-sm hover:bg-red-50"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
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
        )}
      </div>
    </div>
  );
}
